import { notFound } from "next/navigation";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { VERTICALS } from "@/lib/domain/verticals";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — Connecticut event planning and coordination`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-vertical card. A wedding link and a corporate link shared into the same
 * thread should not be the same picture - the card does the same job as the
 * title, and a generic one wastes the only visual a share gets.
 *
 * One image per route, so the alt text above is shared and generic. A
 * per-vertical alt would need generateImageMetadata, which runs during
 * page-data collection with no params and fails the build.
 */
/**
 * The page has its own generateStaticParams; a metadata route does not inherit
 * it, so without this the card is rendered on demand for a set of slugs that is
 * fixed and known at build time.
 */
export function generateStaticParams() {
  return VERTICALS.map((vertical) => ({ vertical: vertical.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical: slug } = await params;
  const vertical = VERTICALS.find((v) => v.slug === slug);
  if (!vertical) notFound();

  return renderOgImage({ title: vertical.h1, eyebrow: vertical.title });
}
