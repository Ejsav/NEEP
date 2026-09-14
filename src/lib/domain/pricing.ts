/**
 * Published fee structure.
 *
 * DELIBERATELY EMPTY. No number appears on this site until the business supplies
 * a real one.
 *
 * The temptation here is to publish market-derived ranges from research - other
 * Connecticut planners' numbers are easy to find. Those are *other companies'*
 * prices. Publishing them as ours would be fabrication, and under FTC pricing
 * guidance an advertised price must be one at which the service is openly and
 * actively offered in good faith. We cannot honour a number the business has
 * not set. See docs/DECISIONS.md D-018.
 *
 * To publish: fill BANDS with real figures. The pricing page switches from its
 * empty state to the table automatically, and nothing else needs changing.
 */

export type PricingBand = {
  /** e.g. "Day-of coordination" */
  name: string;
  /** Matches a SCOPE_TIERS value where the band maps to one. */
  scopeTier?: string;
  /** Written exactly as it should appear. No formatting is applied. */
  range: string;
  /** What the customer actually gets for it. */
  includes: string[];
  /** What is explicitly not in it. */
  excludes: string[];
};

export const BANDS: PricingBand[] = [];

export function pricingIsPublished(): boolean {
  return BANDS.length > 0;
}

/**
 * What moves the cost of an event up or down.
 *
 * These are directional statements about how event pricing works, not claims
 * about our fees and not figures attributed to anyone. They stay true and
 * useful whether or not BANDS is populated, which is why the page is worth
 * publishing before the numbers exist.
 */
export const COST_DRIVERS = [
  {
    heading: "Guest count, in steps rather than smoothly",
    body:
      "Cost does not rise evenly with headcount. It jumps at the thresholds where you outgrow a room, need a second server team, cross a venue's minimum, or move from tables that fit to tents that have to be brought in. The gap between 90 and 110 guests is often larger than the gap between 110 and 160.",
  },
  {
    heading: "Season and day of the week",
    body:
      "Connecticut's peak is concentrated: early autumn for foliage, late spring, and December for corporate parties. A Saturday inside those windows is the most contested date in the state, and every vendor prices accordingly. The same event on a Friday, or in March, is a materially different budget.",
  },
  {
    heading: "Whether the venue is a venue or a field",
    body:
      "A full-service venue includes tables, chairs, kitchen, power, staff and toilets in one line item. A barn, a private home or a state park includes none of those, and each one becomes a separate rental with its own delivery, setup and collection. Raw spaces look cheaper and frequently are not.",
  },
  {
    heading: "The vendor policy",
    body:
      "An exclusive caterer list removes your ability to compete the largest single line in the budget. A mandatory preferred-vendor list does the same in smaller pieces. An open policy is worth real money, and it is the question most couples do not think to ask on a site visit.",
  },
  {
    heading: "How much of it you want us to run",
    body:
      "Full planning, partial planning and day-of coordination are genuinely different amounts of work over genuinely different timescales. Most people need less than they assume, and we would rather scope you correctly than sell you the top tier.",
  },
  {
    heading: "Distance and access",
    body:
      "Travel time gets billed by most vendors, and load-in difficulty gets billed by all of them. A venue with a long carry, a narrow approach, or a strict load-in window costs more to service than one with a loading door.",
  },
];
