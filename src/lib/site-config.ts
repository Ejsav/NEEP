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
  /** Trading name used throughout the public site. */
  name: "New England Event Planners",
  shortName: "NEEP",

  /**
   * One sentence, load-bearing. Describes what the company does without
   * claiming operations it does not perform.
   */
  tagline:
    "One place to start planning your Connecticut event, instead of chasing every vendor yourself.",

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
