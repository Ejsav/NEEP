/**
 * Canonical option sets for the inquiry form.
 *
 * These are the authority. The client renders from them and the server validates
 * against them, so a hand-crafted POST cannot introduce a value the business
 * does not recognise.
 *
 * COPY RULE: transportation is described only with coordinating verbs
 * ("coordination", "arranged through"). The company does not own vehicles,
 * employ drivers, or hold carrier authority, and Connecticut's livery statute
 * turns on whether a business *represents itself* as transporting passengers
 * for hire. See docs/DECISIONS.md and CLAUDE.md.
 */

export const EVENT_TYPES = [
  {
    value: "wedding",
    label: "Wedding",
    blurb: "Ceremony, reception, and the weekend around it.",
  },
  {
    value: "corporate",
    label: "Corporate event",
    blurb: "Holiday parties, offsites, conferences, client events.",
  },
  {
    value: "private",
    label: "Private event",
    blurb: "Milestone birthdays, anniversaries, graduations, celebrations.",
  },
  {
    value: "coordination",
    label: "Venue & vendor coordination only",
    blurb: "You have the vision. You want someone to run the logistics.",
  },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];
export const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value);

export const VENUE_STATUSES = [
  { value: "booked", label: "Booked and signed" },
  { value: "shortlisted", label: "Shortlisted a few" },
  { value: "not_started", label: "Haven't started looking" },
  { value: "need_help", label: "I want help finding one" },
] as const;

export const VENUE_STATUS_VALUES = VENUE_STATUSES.map((s) => s.value);

export const CONTACT_PREFERENCES = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "either", label: "Either is fine" },
] as const;

export const CONTACT_PREFERENCE_VALUES = CONTACT_PREFERENCES.map((c) => c.value);

/**
 * Total event budget bands. This is the CLIENT's budget for the whole event,
 * not a price list for our services. It qualifies the inquiry and lets us route
 * it honestly. Our own fees are a separate, deliberate publishing decision.
 */
export const BUDGET_BANDS = [
  { value: "under_10k", label: "Under $10,000" },
  { value: "10k_25k", label: "$10,000 - $25,000" },
  { value: "25k_50k", label: "$25,000 - $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "over_100k", label: "Over $100,000" },
  { value: "unsure", label: "Still working it out" },
] as const;

export const BUDGET_BAND_VALUES = BUDGET_BANDS.map((b) => b.value);

/**
 * How much of the event we run.
 *
 * Asked as its own question rather than mixed into the module checkboxes,
 * because it is a different kind of decision: the tier sets the shape of the
 * engagement, the modules sit on top of it. Keeping them separate is also what
 * makes the tier usable as a qualification signal.
 *
 * Wording is deliberately plain about what the customer still does themselves.
 * A tier description that oversells is a refund conversation later.
 */
export const SCOPE_TIERS = [
  {
    value: "full_planning",
    label: "Full planning",
    blurb:
      "We run it end to end: venue, vendors, budget, timeline, and the day itself.",
  },
  {
    value: "partial_planning",
    label: "Partial planning",
    blurb:
      "You have some of it handled. We take the parts you don't want to own.",
  },
  {
    value: "day_of_coordination",
    label: "Day-of coordination",
    blurb:
      "You plan it. We take over a few weeks out and run the day so you don't have to.",
  },
] as const;

export type ScopeTierValue = (typeof SCOPE_TIERS)[number]["value"];
export const SCOPE_TIER_VALUES = SCOPE_TIERS.map((t) => t.value);

/**
 * An add-on module. These sit on top of the scope tier - the tier says how much
 * of the event we run, these say which specific pieces are in play.
 */
export type ServiceOption = {
  value: string;
  label: string;
  /** Which verticals surface this option. */
  appliesTo: EventTypeValue[];
};

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    value: "venue_sourcing",
    label: "Venue sourcing and site visits",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "vendor_sourcing",
    label: "Vendor sourcing and vetting",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "timeline_runsheet",
    label: "Timeline and run-of-show",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "catering_bar",
    label: "Catering and bar coordination",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "rentals_decor",
    label: "Rentals and decor",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "photography_sourcing",
    label: "Photography and video sourcing",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "av_production",
    label: "AV and production",
    appliesTo: ["corporate", "private", "coordination"],
  },
  {
    value: "guest_transport_coordination",
    label: "Guest transportation coordination",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
  {
    value: "lodging_blocks",
    label: "Hotel blocks and guest lodging",
    appliesTo: ["wedding", "corporate", "coordination"],
  },
  {
    value: "not_sure",
    label: "Not sure yet - that's why I'm asking",
    appliesTo: ["wedding", "corporate", "private", "coordination"],
  },
];

export const SERVICE_VALUES = SERVICE_OPTIONS.map((s) => s.value);

export function servicesFor(eventType: EventTypeValue): ServiceOption[] {
  return SERVICE_OPTIONS.filter((s) => s.appliesTo.includes(eventType));
}

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function serviceLabels(values: string[] | null | undefined): string[] {
  if (!values) return [];
  return values.map(
    (v) => SERVICE_OPTIONS.find((s) => s.value === v)?.label ?? v,
  );
}
