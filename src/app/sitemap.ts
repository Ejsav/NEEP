import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { VERTICALS } from "@/lib/domain/verticals";

/**
 * Only routes that actually exist and are indexable belong here. A sitemap that
 * lists pages we have not built yet trains crawlers to distrust it.
 *
 * Note the `as const` on changeFrequency: inside a map TypeScript widens the
 * literal to `string` and MetadataRoute.Sitemap rejects it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

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
  ];
}
