/**
 * Connecticut regions, as couples and organisers actually talk about them.
 *
 * Import-free by design - the client-side filter bar reads these, and pulling
 * the database layer into the browser through a label array is exactly the leak
 * that put 90KB of Zod on the planner route.
 */
export const REGIONS = [
  {
    slug: "shoreline",
    value: "shoreline",
    name: "The Connecticut shoreline",
    short: "Shoreline",
    blurb:
      "Mystic through Madison and Branford: water views, tighter parking, and salt-air weather contingencies that matter more than people expect.",
  },
  {
    slug: "litchfield-hills",
    value: "litchfield",
    name: "The Litchfield Hills",
    short: "Litchfield Hills",
    blurb:
      "Barns, inns and estates in the northwest corner. The foliage window is real and it is short, which is what drives the pricing up there.",
  },
  {
    slug: "fairfield-county",
    value: "fairfield",
    name: "Fairfield County",
    short: "Fairfield County",
    blurb:
      "Greenwich through Westport and Fairfield. The densest corporate market in the state, and the strictest municipal noise rules.",
  },
  {
    slug: "river-valley",
    value: "river_valley",
    name: "The Connecticut River valley",
    short: "River valley",
    blurb:
      "Essex, Middletown, Chester and the towns between. Historic properties, and the widest spread of open-vendor policies in the state.",
  },
  {
    slug: "greater-hartford",
    value: "hartford",
    name: "Greater Hartford",
    short: "Greater Hartford",
    blurb:
      "The corporate centre of the state: conference space, hotel inventory and weekday availability that the shoreline simply does not have.",
  },
] as const;

export type Region = (typeof REGIONS)[number];

export function regionBySlug(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}

export function regionByValue(value: string): Region | undefined {
  return REGIONS.find((r) => r.value === value);
}
