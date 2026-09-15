import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Declared image slots.
 *
 * Every image the site expects is named here with its alt text written in
 * advance, because alt text decided at the last minute is alt text that says
 * "hero image". The page-contract check fails a build where any image lacks it.
 *
 * A slot renders only when its file is actually present in public/images. That
 * is what lets the design ship complete today, with the type-only treatment as
 * the real fallback rather than a broken image icon - and what lets someone add
 * a photograph later by committing a file and nothing else.
 *
 * ALT TEXT RULE. These describe what is in the frame and nothing more. None of
 * them claims the scene is an event this company ran, because none of them is.
 * Imagery here is atmosphere; it is never evidence. See docs/DECISIONS.md D-019.
 */

export type ImageSlotDefinition = {
  /**
   * Filename WITHOUT extension. Any supported format is accepted.
   *
   * Two slots MAY share a basename. One photograph doing two jobs on two pages
   * is a legitimate thing to want, and duplicating the bytes under a second
   * name to express it would be worse in every respect.
   */
  basename: string;
  alt: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait";
};

export type ImageSlot = ImageSlotDefinition & {
  /** Resolved path under public/, including the extension found on disk. */
  src: string;
};

/**
 * Accepted formats, most efficient first.
 *
 * Extension-agnostic on purpose. Requiring an exact ".jpg" turned "add a
 * photograph" into "add a photograph and also know which of five extensions the
 * code happens to expect", which is a pointless way to lose twenty minutes.
 * Drop in a .png or a .webp and it just works.
 */
const EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"] as const;

export const IMAGE_SLOTS = {
  "hero-home": {
    basename: "hero-home",
    alt: "A waterfront function room set for dinner before guests arrive: round tables laid with white linen, glassware and low white floral arrangements, low sun coming off the water through tall windows.",
    width: 2560,
    height: 1440,
    orientation: "landscape",
  },
  "hero-weddings": {
    basename: "hero-weddings",
    alt: "A single place setting on a linen tablecloth: stacked ceramic plates, a folded napkin, a printed menu card, polished cutlery and a wine glass, with a white and green arrangement behind.",
    width: 1132,
    height: 1456,
    orientation: "portrait",
  },
  "hero-corporate-events": {
    basename: "hero-corporate-events",
    alt: "An empty function room set in rows for a presentation: dark stacking chairs facing a blank projection screen and a lectern, daylight from tall windows along one wall.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "hero-private-events": {
    basename: "hero-private-events",
    alt: "A long outdoor table laid for a private dinner at golden hour: mismatched wooden chairs, linen runners, candles, glassware and shared serving bowls down the centre.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "hero-venue-vendor-coordination": {
    basename: "hero-venue-vendor-coordination",
    alt: "A printed run-of-show and a venue floor plan laid out on a road case during load-in, with a two-way radio beside them and a tented terrace lit for the evening in the background.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  /**
   * The machinery shot, on /how-we-work above the document samples.
   *
   * Shares the coordination pillar's file on purpose: it is the same frame
   * doing the same work in two places, and the page that needs it most is the
   * one explaining how the work is actually done.
   *
   * REQUIRES A CAPTION wherever it renders. The run of show in the frame is
   * dated and specific, so uncaptioned it reads as a record of an event this
   * company ran - which is the exact line docs/DECISIONS.md D-026 draws.
   */
  "machinery-run-of-show": {
    basename: "hero-venue-vendor-coordination",
    alt: "A printed run of show and a marked-up floor plan on a road case during load-in, a two-way radio beside them, a tented terrace lit for the evening behind.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "about-connecticut": {
    basename: "about-connecticut",
    alt: "A quiet Connecticut landscape out of season: bare trees and low winter light over open ground.",
    width: 1600,
    height: 1200,
    orientation: "landscape",
  },
} as const satisfies Record<string, ImageSlotDefinition>;

export type ImageSlotName = keyof typeof IMAGE_SLOTS;

/**
 * Resolves a slot against whatever is actually on disk.
 *
 * Checked on disk rather than tracked in a list, so adding a photograph is a
 * one-file commit with no code change. Server-side only, and evaluated at build
 * time for the static routes, so it costs nothing per request.
 */
export function imageSlot(name: ImageSlotName): ImageSlot | null {
  const definition = IMAGE_SLOTS[name];
  for (const extension of EXTENSIONS) {
    const relative = `images/${definition.basename}.${extension}`;
    if (existsSync(join(process.cwd(), "public", relative))) {
      return { ...definition, src: `/${relative}` };
    }
  }
  return null;
}

export function imagePresent(name: ImageSlotName): boolean {
  return imageSlot(name) !== null;
}
