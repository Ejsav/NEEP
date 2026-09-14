import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { venueFieldSources, venues } from "@/lib/db/schema";
import type { Venue, VenueFieldSource } from "@/lib/db/schema";
import { assertPublishable } from "@/lib/venues/gate";

/**
 * Venue reads.
 *
 * Everything public goes through the gate. A record that has not cleared it is
 * not "not ready yet" - it is a page we would be pointing crawlers at while it
 * has nothing on it, so it does not exist as far as the public site is
 * concerned.
 */

export type VenueWithSources = {
  venue: Venue;
  sources: VenueFieldSource[];
};

async function withSources(rows: Venue[]): Promise<VenueWithSources[]> {
  if (rows.length === 0) return [];
  const allSources = await db.select().from(venueFieldSources);
  const byVenue = new Map<string, VenueFieldSource[]>();
  for (const source of allSources) {
    const list = byVenue.get(source.venueId) ?? [];
    list.push(source);
    byVenue.set(source.venueId, list);
  }
  return rows.map((venue) => ({
    venue,
    sources: byVenue.get(venue.id) ?? [],
  }));
}

/** Every venue that clears the gate, in name order. */
export async function listPublishableVenues(): Promise<VenueWithSources[]> {
  try {
    const rows = await db.select().from(venues).orderBy(asc(venues.name));
    const paired = await withSources(rows);
    return paired.filter((v) => assertPublishable(v.venue, v.sources).publishable);
  } catch (error) {
    // An empty directory is a worse outcome than a slow one, but it is a far
    // better outcome than a 500 on a public page.
    console.error("[venues] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** One venue, only if it clears the gate. */
export async function getPublishableVenue(
  slug: string,
): Promise<VenueWithSources | null> {
  try {
    const [row] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
    if (!row) return null;

    const sources = await db
      .select()
      .from(venueFieldSources)
      .where(eq(venueFieldSources.venueId, row.id));

    if (!assertPublishable(row, sources).publishable) return null;
    return { venue: row, sources };
  } catch (error) {
    console.error("[venues] read failed", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function listPublishableByRegion(
  region: string,
): Promise<VenueWithSources[]> {
  const all = await listPublishableVenues();
  return all.filter((v) => v.venue.region === region);
}
