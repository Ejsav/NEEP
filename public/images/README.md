# Site imagery

Drop a file here with the exact name below and it appears on the site. Nothing
else needs changing: `src/lib/images.ts` declares each slot with its alt text
and dimensions, and a slot renders only when its file is present.

A missing file is not a broken image. The pages were designed type-first, so an
absent slot degrades to the original treatment.

**Any format works** — `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif`. Only the
name before the extension has to match.

| Name | Where it appears | Size | Orientation |
| --- | --- | --- | --- |
| `hero-home` | Homepage, full-bleed under the hero copy | 2560 × 1440 | landscape |
| `hero-weddings` | `/weddings` hero, right column | 1132 × 1456 | portrait |
| `hero-corporate-events` | `/corporate-events` hero, right column | 1800 × 1200 | landscape |
| `hero-private-events` | `/private-events` hero, right column | 1800 × 1200 | landscape |
| `hero-venue-vendor-coordination` | `/venue-vendor-coordination` hero, right column **and** the machinery block on `/how-we-work` | 1800 × 1200 | landscape |
| `about-connecticut` | `/about` | 1600 × 1200 | landscape |

If the dimensions of a file differ from the table, update the slot in
`src/lib/images.ts` to match. Two things there matter: the numbers are what the
browser uses to reserve space before the bytes arrive, and wrong ones cause
layout shift; and `orientation` decides the shape the image is displayed at, so
a landscape file declared portrait will be cropped hard down its middle.

The four vertical heroes all sit in the same column, so landscape and portrait
sources are both fine — declare which one you supplied and the layout follows
it.

## Two slots may share one file

`machinery-run-of-show` deliberately points at `hero-venue-vendor-coordination`.
One photograph doing two jobs on two pages is a legitimate thing to want, and
duplicating the bytes under a second name to express it would be worse in every
respect. Drop a distinct file in later and split them by changing one
`basename` in `src/lib/images.ts`.

## Captions

`SlotImage` takes an optional `caption`, rendered as a real
`<figure>`/`<figcaption>`. Two rules in this project require one:

- **Vehicle imagery** needs an adjacent "representative" caption or must not
  appear at all. That is the CGS §13b-101 boundary, not a style preference.
- **Anything that could be read as evidence of a completed event** has to say
  what it actually is. The run-of-show frame carries a dated document, so it
  ships captioned.

An image that needs a caption and does not get one is a claim nobody wrote down.

## What to shoot — the machinery, not the flowers

Every site in this category is a gallery of florals and first dances. The thing
that separates this one is the work underneath: a marked-up floor plan, a
walkthrough with a clipboard, load-in in progress, a vendor briefing, staging
before doors open, the room in the ninety seconds before anyone is let in.

Weight the shot list roughly **two-thirds machinery, one-third atmosphere.**
Atmosphere still matters — it is what makes the result feel worth buying — but
it is the minority, because it is the half a competitor can buy from a stock
library and the machinery is not.

A photograph of our own working documents, kit or process is honest and needs no
caveat. A photograph that would read as a record of an event this company ran is
not, until there is one. That is the whole line, and it is the same one
`src/components/sections/document-sample.tsx` holds for the rendered templates.

## Before committing an image

- **Budget.** The homepage hero must come out under 180 KB in AVIF. Next
  generates AVIF and WebP automatically; `pnpm perf` fails the build if a route
  goes over.
- **No recognisable faces.** Imagery here is atmosphere, never evidence of an
  event this company ran.
- **No readable third-party names** on signage, lecterns, banners or documents.
- **Connecticut, or nowhere identifiable.** Nothing may imply operations
  outside the state.
- **No vehicle imagery** without the adjacent "representative" caption CLAUDE.md
  requires. Simplest is to avoid it.

Reasoning for all of the above: `docs/DECISIONS.md` D-019.
