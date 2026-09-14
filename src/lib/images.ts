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

export type ImageSlot = {
  /** Path under public/, and the filename to commit. */
  src: string;
  alt: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait";
};

export const IMAGE_SLOTS = {
  "hero-home": {
    src: "/images/hero-home.jpg",
    alt: "A waterfront function room set for dinner before guests arrive: round tables laid with white linen, glassware and low white floral arrangements, low sun coming off the water through tall windows.",
    width: 2560,
    height: 1440,
    orientation: "landscape",
  },
  "hero-weddings": {
    src: "/images/hero-weddings.jpg",
    alt: "A single place setting on a linen tablecloth: stacked ceramic plates, a folded napkin, a printed menu card, polished cutlery and a wine glass, with a white and green arrangement behind.",
    width: 1132,
    height: 1456,
    orientation: "portrait",
  },
  "hero-corporate-events": {
    src: "/images/hero-corporate-events.jpg",
    alt: "An empty function room set in rows for a presentation: dark stacking chairs facing a blank projection screen and a lectern, daylight from tall windows along one wall.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "hero-private-events": {
    src: "/images/hero-private-events.jpg",
    alt: "A long outdoor table laid for a private dinner at golden hour: mismatched wooden chairs, linen runners, candles, glassware and shared serving bowls down the centre.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "hero-venue-vendor-coordination": {
    src: "/images/hero-venue-vendor-coordination.jpg",
    alt: "A printed run-of-show and a venue floor plan laid out on a road case during load-in, with a two-way radio beside them and a tented terrace lit for the evening in the background.",
    width: 1800,
    height: 1200,
    orientation: "landscape",
  },
  "about-connecticut": {
    src: "/images/about-connecticut.jpg",
    alt: "A quiet Connecticut landscape out of season: bare trees and low winter light over open ground.",
    width: 1600,
    height: 1200,
    orientation: "landscape",
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotName = keyof typeof IMAGE_SLOTS;

/**
 * Whether the file behind a slot actually exists.
 *
 * Checked on disk rather than tracked in a list, so adding a photograph is a
 * one-file commit. Server-side only, and evaluated at build time for the static
 * routes, so it costs nothing per request.
 */
export function imagePresent(name: ImageSlotName): boolean {
  const slot = IMAGE_SLOTS[name];
  return existsSync(join(process.cwd(), "public", slot.src.replace(/^\//, "")));
}

export function imageSlot(name: ImageSlotName): ImageSlot | null {
  return imagePresent(name) ? IMAGE_SLOTS[name] : null;
}
