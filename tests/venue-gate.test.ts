import { describe, expect, it } from "vitest";
import {
  MIN_NARRATIVE_WORDS,
  assertPublishable,
  countWords,
  isStale,
  renderableFields,
} from "@/lib/venues/gate";
import type { Venue, VenueFieldSource } from "@/lib/db/schema";

/**
 * The publication gate.
 *
 * These are the tests that make the gate a gate rather than a policy. Each one
 * describes a way a thin or unsourced record could otherwise reach the index.
 */

const prose = Array.from({ length: MIN_NARRATIVE_WORDS }, (_, i) => `word${i}`).join(" ");

function venue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "v1",
    slug: "test-venue",
    name: "Test Venue",
    town: "Mystic",
    region: "shoreline",
    venueType: "estate",
    officialUrl: "https://example.com",
    latitude: null,
    longitude: null,
    capacitySeated: 150,
    capacityStanding: null,
    capacityCeremony: null,
    capacityReception: null,
    capacityByRoom: null,
    indoor: true,
    outdoor: true,
    tentedAllowed: null,
    tentRestrictions: null,
    parkingSpaces: null,
    parkingNotes: "Overflow lot across the road.",
    valetAvailable: null,
    shuttleStagingNotes: null,
    loadInNotes: null,
    loadInEarliestTime: null,
    dropOffNotes: null,
    curfewTime: "23:00",
    curfewSource: "town ordinance",
    amplifiedMusicCutoff: null,
    noiseOrdinanceReference: null,
    vendorPolicy: "open",
    preferredVendorRequired: null,
    inHouseCatering: null,
    outsideCateringAllowed: null,
    barPolicy: null,
    nearestHotels: null,
    hotelBlockNotes: null,
    driveTimes: null,
    accessibilityNotes: null,
    stepFreeAccess: null,
    accessibleRestrooms: null,
    seasonalAvailabilityNotes: null,
    peakSeasonMonths: null,
    offSeasonMonths: null,
    narrative: prose,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Venue;
}

function source(
  fieldName: string,
  overrides: Partial<VenueFieldSource> = {},
): VenueFieldSource {
  return {
    id: `s-${fieldName}`,
    venueId: "v1",
    fieldName,
    sourceType: "venue_site",
    sourceUrl: "https://example.com/weddings",
    verifiedAt: new Date().toISOString().slice(0, 10),
    confidence: "verified",
    note: null,
    ...overrides,
  } as VenueFieldSource;
}

const fullSources = [
  source("capacitySeated"),
  source("parkingNotes"),
  source("curfewTime", { sourceType: "municipal_code" }),
  source("vendorPolicy"),
  source("indoor"),
];

describe("venue publication gate", () => {
  it("passes a complete, sourced record", () => {
    expect(assertPublishable(venue(), fullSources)).toEqual({
      publishable: true,
      reasons: [],
    });
  });

  it("rejects a record with no verified capacity figure", () => {
    const verdict = assertPublishable(
      venue(),
      fullSources.filter((s) => s.fieldName !== "capacitySeated"),
    );
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("capacity");
  });

  it("rejects a number that has no source behind it", () => {
    // The failure mode that matters: a plausible figure reaching a page with
    // nothing to back it up.
    const verdict = assertPublishable(venue({ parkingSpaces: 40 }), fullSources);
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("parkingSpaces");
  });

  it("rejects thin prose", () => {
    const verdict = assertPublishable(
      venue({ narrative: "A lovely venue in Mystic." }),
      fullSources,
    );
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("Narrative");
  });

  it("rejects a record that is only identity plus a capacity", () => {
    const verdict = assertPublishable(venue(), [source("capacitySeated")]);
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("non-identity");
  });

  it("does not count identity fields towards substance", () => {
    const verdict = assertPublishable(venue(), [
      source("capacitySeated"),
      source("name"),
      source("town"),
      source("officialUrl"),
      source("venueType"),
    ]);
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("non-identity");
  });

  it("does not count a source that is merely reported", () => {
    const verdict = assertPublishable(
      venue(),
      fullSources.map((s) => ({ ...s, confidence: "reported" as const })),
    );
    expect(verdict.publishable).toBe(false);
  });

  it("does not count a source with no URL", () => {
    const verdict = assertPublishable(
      venue(),
      fullSources.map((s) => ({ ...s, sourceUrl: null })),
    );
    expect(verdict.publishable).toBe(false);
  });

  it("accepts direct confirmation when it records who confirmed it", () => {
    const confirmed = fullSources.map((s) => ({
      ...s,
      sourceType: "direct_confirmation" as const,
      sourceUrl: null,
      note: "Confirmed by events manager, by phone.",
    }));
    expect(assertPublishable(venue(), confirmed).publishable).toBe(true);
  });

  it("rejects direct confirmation that records nothing", () => {
    const confirmed = fullSources.map((s) => ({
      ...s,
      sourceType: "direct_confirmation" as const,
      sourceUrl: null,
      note: null,
    }));
    expect(assertPublishable(venue(), confirmed).publishable).toBe(false);
  });

  it("rejects an empty record outright, with every reason listed", () => {
    const verdict = assertPublishable(
      venue({
        name: "",
        town: "",
        officialUrl: null,
        capacitySeated: null,
        narrative: null,
      }),
      [],
    );
    expect(verdict.publishable).toBe(false);
    expect(verdict.reasons.length).toBeGreaterThanOrEqual(5);
  });

  it("flags a fact older than twelve months as stale", () => {
    const old = source("capacitySeated", { verifiedAt: "2020-01-01" });
    expect(isStale(old)).toBe(true);
    expect(isStale(source("capacitySeated"))).toBe(false);
  });

  it("only exposes usable fields for rendering", () => {
    const map = renderableFields([
      source("capacitySeated"),
      source("parkingSpaces", { confidence: "unknown" }),
    ]);
    expect(map.has("capacitySeated")).toBe(true);
    expect(map.has("parkingSpaces"), "unknown never renders").toBe(false);
  });

  it("counts words the way the gate expects", () => {
    expect(countWords(null)).toBe(0);
    expect(countWords("  one   two \n three ")).toBe(3);
  });
});
