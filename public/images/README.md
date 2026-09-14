# Site imagery

Drop a file here with the exact name below and it appears on the site. Nothing
else needs changing: `src/lib/images.ts` declares each slot with its alt text
and dimensions, and a slot renders only when its file is present.

A missing file is not a broken image. The pages were designed type-first, so an
absent slot degrades to the original treatment.

| Filename | Where it appears | Size | Orientation |
| --- | --- | --- | --- |
| `hero-home.jpg` | Homepage, full-bleed under the hero copy | 2560 × 1440 | landscape |
| `hero-weddings.jpg` | `/weddings` hero, right column | 1132 × 1456 | portrait |
| `hero-corporate-events.jpg` | `/corporate-events` hero, right column | 1800 × 1200 | landscape |
| `hero-private-events.jpg` | `/private-events` hero, right column | 1800 × 1200 | landscape |
| `hero-venue-vendor-coordination.jpg` | `/venue-vendor-coordination` hero, right column | 1800 × 1200 | landscape |
| `about-connecticut.jpg` | `/about` | 1600 × 1200 | landscape |

If the dimensions of a file differ from the table, update the slot in
`src/lib/images.ts` to match. The numbers there are what the browser uses to
reserve space before the bytes arrive, and wrong ones cause layout shift.

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
