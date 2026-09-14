/**
 * Imports venue records and their provenance from CSV.
 *
 * Usage:
 *   pnpm venues:import venues.csv facts.csv
 *   pnpm venues:import venues.csv facts.csv --dry-run
 *
 * TWO FILES, BECAUSE A FACT WITHOUT A SOURCE IS NOT A FACT.
 *
 *   venues.csv  slug,name,town,region,venue_type,official_url,narrative
 *   facts.csv   slug,field_name,value,source_type,source_url,verified_at,
 *               confidence,note
 *
 * Every row in facts.csv writes one column on the venue AND one provenance
 * record, together. There is deliberately no way to set a fact without saying
 * where it came from - that is the whole design, and making it awkward to
 * bypass is the point.
 *
 * The importer never publishes anything. It writes records; the gate in
 * lib/venues/gate.ts decides what the public site shows, and this script
 * reports each venue's verdict so you can see what is still missing.
 */
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { venueFieldSources, venues } from "../src/lib/db/schema";
import { assertPublishable } from "../src/lib/venues/gate";

config({ path: ".env.local", quiet: true });

/** Minimal RFC-4180 reader: quoted fields, escaped quotes, embedded newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  return body.map((cells) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])),
  );
}

/** Columns that are integers on `venues`. */
const INTEGER_FIELDS = new Set([
  "capacitySeated",
  "capacityStanding",
  "capacityCeremony",
  "capacityReception",
  "parkingSpaces",
]);

const BOOLEAN_FIELDS = new Set([
  "indoor",
  "outdoor",
  "tentedAllowed",
  "valetAvailable",
  "preferredVendorRequired",
  "inHouseCatering",
  "outsideCateringAllowed",
  "stepFreeAccess",
  "accessibleRestrooms",
]);

const JSON_FIELDS = new Set([
  "capacityByRoom",
  "nearestHotels",
  "driveTimes",
  "peakSeasonMonths",
  "offSeasonMonths",
]);

function coerce(field: string, raw: string): unknown {
  if (raw === "") return null;
  if (INTEGER_FIELDS.has(field)) {
    const n = Number.parseInt(raw.replace(/[,\s]/g, ""), 10);
    if (!Number.isFinite(n)) throw new Error(`${field}: "${raw}" is not a number`);
    return n;
  }
  if (BOOLEAN_FIELDS.has(field)) return /^(true|yes|y|1)$/i.test(raw);
  if (JSON_FIELDS.has(field)) return JSON.parse(raw);
  return raw;
}

async function main() {
  const [venuesPath, factsPath, ...flags] = process.argv.slice(2);
  const dryRun = flags.includes("--dry-run");

  if (!venuesPath || !factsPath) {
    console.error("Usage: pnpm venues:import <venues.csv> <facts.csv> [--dry-run]");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const venueRows = parseCsv(readFileSync(venuesPath, "utf8"));
  const factRows = parseCsv(readFileSync(factsPath, "utf8"));

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  try {
    for (const row of venueRows) {
      if (!row.slug || !row.name || !row.town || !row.region) {
        console.error(`SKIP  ${row.slug || "(no slug)"}: slug, name, town and region are all required`);
        continue;
      }

      const facts = factRows.filter((f) => f.slug === row.slug);
      const columns: Record<string, unknown> = {};
      const provenance: (typeof venueFieldSources.$inferInsert)[] = [];
      let bad = false;

      for (const fact of facts) {
        if (!fact.field_name) continue;
        if (!fact.verified_at) {
          console.error(`SKIP  ${row.slug}.${fact.field_name}: no verified_at`);
          bad = true;
          continue;
        }
        try {
          columns[fact.field_name] = coerce(fact.field_name, fact.value);
        } catch (error) {
          console.error(`SKIP  ${row.slug}.${fact.field_name}: ${(error as Error).message}`);
          bad = true;
          continue;
        }
        provenance.push({
          venueId: "",
          fieldName: fact.field_name,
          sourceType: (fact.source_type || "venue_site") as "venue_site",
          sourceUrl: fact.source_url || null,
          verifiedAt: fact.verified_at,
          confidence: (fact.confidence || "reported") as "reported",
          note: fact.note || null,
        });
      }
      if (bad) continue;

      const values = {
        slug: row.slug,
        name: row.name,
        town: row.town,
        region: row.region as "shoreline",
        venueType: row.venue_type || null,
        officialUrl: row.official_url || null,
        narrative: row.narrative || null,
        ...columns,
        updatedAt: new Date(),
      };

      if (dryRun) {
        console.log(`DRY   ${row.slug}: ${provenance.length} sourced field(s)`);
        continue;
      }

      const [saved] = await db
        .insert(venues)
        .values(values)
        .onConflictDoUpdate({ target: venues.slug, set: values })
        .returning();

      // Provenance is replaced wholesale: a fact removed from the sheet must
      // not leave a stale source vouching for a value that is no longer there.
      await db.delete(venueFieldSources).where(eq(venueFieldSources.venueId, saved.id));
      if (provenance.length > 0) {
        await db
          .insert(venueFieldSources)
          .values(provenance.map((p) => ({ ...p, venueId: saved.id })));
      }

      const sources = await db
        .select()
        .from(venueFieldSources)
        .where(eq(venueFieldSources.venueId, saved.id));
      const verdict = assertPublishable(saved, sources);

      if (verdict.publishable) {
        console.log(`OK    ${row.slug}: publishable`);
      } else {
        console.log(`HELD  ${row.slug}: ${verdict.reasons.join(" ")}`);
      }
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
