/**
 * Public company facts.
 *
 * HARD RULE: nothing in this file may be invented. A contact route that is not
 * configured is rendered as absent, never as a placeholder. A fake phone number
 * on a lead-generation site is worse than no phone number - it destroys trust
 * on the one call that mattered.
 *
 * Values that are genuinely unknown until the business supplies them are read
 * from environment variables and are typed as possibly-null so every consumer
 * is forced to handle the empty state. See docs/TRUST_STRATEGY.md.
 */

function publicEnv(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

export const siteConfig = {
  /** Legal entity. Used where the entity must be named, and nowhere else. */
  legalName: "New England Event Planners LLC",
  /**
   * Trading name used throughout the public site. PROVISIONAL.
   *
   * The public brand is under review; the legal entity above is not. Changing
   * this one value changes every public surface - metadata, Open Graph cards,
   * structured data, llms.txt, the footer - because nothing else in the
   * codebase hardcodes it. The `pnpm brand:check` script proves that claim
   * rather than trusting it. See docs/DECISIONS.md D-025.
   */
  name: "New England Event Planners",
  shortName: "NEEP",

  /**
   * One sentence, load-bearing. Feeds the homepage description, the Open Graph
   * cards, the footer and llms.txt, so it moves everywhere at once.
   *
   * It sells CERTAINTY, not convenience. "One place to start" described a
   * directory; the company is the operator that carries an event from a date
   * and a budget to a thing that actually happened. What it must not do is
   * claim a scale of work not yet performed - the register is raised by how
   * the site reads, never by asserting a number.
   */
  tagline:
    "One company to plan, coordinate and run your Connecticut event, from the first decision to the last van out.",

  /** Launch market. Architecture supports expansion; copy must not imply it. */
  serviceArea: {
    state: "Connecticut",
    stateCode: "CT",
    description: "Connecticut",
  },

  contact: {
    email: publicEnv(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    /** E.164 for tel: links. */
    phone: publicEnv(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    /** Human-formatted for display. */
    phoneDisplay: publicEnv(process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY),
  },

  /**
   * The company has no public storefront address to publish. Per current
   * structured-data guidance we therefore emit Organization with areaServed
   * rather than LocalBusiness, and we do not mark up an address we cannot show.
   * See docs/SEO_STRATEGY.md.
   */
  postalAddress: null,

  /** Populated only when real, verifiable profiles exist. */
  socialProfiles: [] as string[],
} as const;

export function hasEmail(): boolean {
  return siteConfig.contact.email !== null;
}

export function hasPhone(): boolean {
  return siteConfig.contact.phone !== null;
}

/** True when the site can offer at least one direct contact route. */
export function hasAnyDirectContact(): boolean {
  return hasEmail() || hasPhone();
}
