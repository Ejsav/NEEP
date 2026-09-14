import type { Venue, VenueFieldSource } from "@/lib/db/schema";

/**
 * The publication gate.
 *
 * A venue page ships only when it carries enough verified, sourced, genuinely
 * venue-specific substance to be worth a visitor's time. Anything that cannot
 * clear this stays unpublished - it does NOT ship as a thin page to be filled
 * in later, because that is precisely the doorway-page pattern CLAUDE.md
 * forbids.
 *
 * This is written as a pure function on purpose. The gate is called by the page
 * (to decide indexability) and by sitemap.ts (to decide inclusion), so both
 * reach the same verdict from the same code rather than from two policies that
 * drift. It has its own unit tests: a gate nobody tests is a policy, not a gate.
 *
 * Criteria come from docs/VENUE_DATABASE.md and PLAN.md section 4.
 */

/** Fields that establish which venue this is, and so do not count as substance. */
const IDENTITY_FIELDS = new Set([
  "slug",
  "name",
  "town",
  "region",
  "officialUrl",
  "latitude",
  "longitude",
  "venueType",
]);

const CAPACITY_FIELDS = [
  "capacitySeated",
  "capacityStanding",
  "capacityCeremony",
  "capacityReception",
  "capacityByRoom",
] as const;

export const MIN_NARRATIVE_WORDS = 400;
export const MIN_VERIFIED_NON_IDENTITY_FIELDS = 4;

/** Facts older than this render as "last confirmed" rather than as current. */
export const STALE_AFTER_MONTHS = 12;

export type GateVerdict = {
  publishable: boolean;
  /** Why not, in plain language. Shown in admin, never to the public. */
  reasons: string[];
};

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** A source only counts when it is verified AND says where it came from. */
function isUsable(source: VenueFieldSource): boolean {
  if (source.confidence !== "verified") return false;
  // Direct confirmation has no URL by nature; the note records who said it.
  if (source.sourceType === "direct_confirmation") {
    return Boolean(source.note && source.note.trim() !== "");
  }
  return Boolean(source.sourceUrl && source.sourceUrl.trim() !== "");
}

export function isStale(source: VenueFieldSource, now: Date = new Date()): boolean {
  const verified = new Date(`${source.verifiedAt}T12:00:00Z`);
  if (Number.isNaN(verified.getTime())) return true;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS);
  return verified < cutoff;
}

export function assertPublishable(
  venue: Venue,
  sources: VenueFieldSource[],
): GateVerdict {
  const reasons: string[] = [];

  // 1. Identity must be complete and correct.
  if (!venue.name?.trim()) reasons.push("No name.");
  if (!venue.town?.trim()) reasons.push("No town.");
  if (!venue.region) reasons.push("No region.");
  if (!venue.officialUrl?.trim()) reasons.push("No official URL.");

  const usable = sources.filter(isUsable);
  const usableFields = new Set(usable.map((s) => s.fieldName));

  // 2. At least one verified capacity figure, with a source.
  const hasCapacity = CAPACITY_FIELDS.some(
    (field) =>
      venue[field] !== null && venue[field] !== undefined && usableFields.has(field),
  );
  if (!hasCapacity) {
    reasons.push("No verified capacity figure with a source.");
  }

  // 3. At least four verified fields beyond identity.
  const substantive = [...usableFields].filter(
    (field) =>
      !IDENTITY_FIELDS.has(field) &&
      venue[field as keyof Venue] !== null &&
      venue[field as keyof Venue] !== undefined,
  );
  if (substantive.length < MIN_VERIFIED_NON_IDENTITY_FIELDS) {
    reasons.push(
      `Only ${substantive.length} verified non-identity field(s); needs ${MIN_VERIFIED_NON_IDENTITY_FIELDS}.`,
    );
  }

  // 4. Prose a template could not produce.
  const words = countWords(venue.narrative);
  if (words < MIN_NARRATIVE_WORDS) {
    reasons.push(`Narrative is ${words} words; needs ${MIN_NARRATIVE_WORDS}.`);
  }

  // 5. Nothing rendered as a number may be unsourced. This is the rule that
  //    stops a plausible-looking figure from reaching a page with nothing
  //    behind it.
  const numericFields = [
    "capacitySeated",
    "capacityStanding",
    "capacityCeremony",
    "capacityReception",
    "parkingSpaces",
  ] as const;
  for (const field of numericFields) {
    const value = venue[field];
    if (value !== null && value !== undefined && !usableFields.has(field)) {
      reasons.push(`${field} has a value but no verified source.`);
    }
  }

  return { publishable: reasons.length === 0, reasons };
}

/**
 * Fields safe to render, keyed by name.
 *
 * A field absent from this map must render as "not confirmed" - never blank,
 * because a blank cell reads as "no parking" rather than "we have not checked".
 */
export function renderableFields(
  sources: VenueFieldSource[],
): Map<string, VenueFieldSource> {
  const map = new Map<string, VenueFieldSource>();
  for (const source of sources) {
    if (isUsable(source)) map.set(source.fieldName, source);
  }
  return map;
}
