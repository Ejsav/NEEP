import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { VERTICALS } from "@/lib/domain/verticals";
import { listPublishableVenues } from "@/lib/venues/queries";
import { REGIONS } from "@/lib/venues/regions";

/**
 * Only routes that actually exist and are indexable belong here. A sitemap that
 * lists pages we have not built yet trains crawlers to distrust it.
 *
 * Venue and guide pages are gated: a record is listed here only if it clears
 * lib/venues/gate.ts, and a guide only if it has records behind it. The page
 * and the sitemap call the same function, so they cannot disagree about what
 * is publishable - which is the failure mode that produces a sitemap full of
 * pages that render noindex.
 *
 * Note the `as const` on changeFrequency: inside a map TypeScript widens the
 * literal to `string` and MetadataRoute.Sitemap rejects it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const lastModified = new Date();

  const venues = await listPublishableVenues();
  const regionsWithVenues = REGIONS.filter((region) =>
    venues.some((v) => v.venue.region === region.value),
  );

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${base}/plan`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    ...VERTICALS.map((vertical) => ({
      url: `${base}/${vertical.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["how-we-work", "pricing", "about", "contact"].map((slug) => ({
      url: `${base}/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...(venues.length > 0
      ? [
          {
            url: `${base}/venues`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.8,
          },
        ]
      : []),
    ...venues.map(({ venue }) => ({
      url: `${base}/venues/${venue.slug}`,
      lastModified: venue.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...regionsWithVenues.map((region) => ({
      url: `${base}/guides/${region.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...["privacy", "terms", "accessibility"].map((slug) => ({
      url: `${base}/${slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
