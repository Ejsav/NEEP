import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — Connecticut event planning and coordination`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Default social card. Metadata file conventions cascade, so this is what every
 * route shares unless it declares its own.
 */
export default function Image() {
  return renderOgImage({
    title: "One place to start planning your Connecticut event.",
  });
}
