import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site-config";

/**
 * Social card renderer.
 *
 * The root layout declares `twitter: { card: "summary_large_image" }`, which is
 * a promise: without an image behind it every share renders as a blank slab
 * with a URL under it. This is the image.
 *
 * Fonts are READ FROM DISK, not fetched. Satori needs real font binaries, and
 * the obvious route - pulling them from Google at build time - makes image
 * generation depend on a third-party host being reachable from whatever machine
 * happens to be building. Fraunces and Instrument Sans are both SIL OFL, so the
 * static instances live in the repo and this is hermetic. See _og/README.md.
 *
 * The design is the site's, not a generic gradient: warm paper, one claret rule,
 * the display face doing the work. It has to be legible as a 1.5cm-tall
 * thumbnail in a message preview, so there are exactly three elements.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const FONT_DIR = join(process.cwd(), "src", "app", "_og");

async function fonts() {
  const [display, sans] = await Promise.all([
    readFile(join(FONT_DIR, "Fraunces-SemiBold.ttf")),
    readFile(join(FONT_DIR, "InstrumentSans-Medium.ttf")),
  ]);
  return [
    { name: "Fraunces", data: display, style: "normal" as const, weight: 600 as const },
    { name: "Instrument", data: sans, style: "normal" as const, weight: 500 as const },
  ];
}

/**
 * @param title   The headline. Kept short by the caller; long titles shrink
 *                rather than wrap to four lines.
 * @param eyebrow Small label above the title. Defaults to the service area.
 */
export async function renderOgImage({
  title,
  eyebrow = siteConfig.serviceArea.description,
}: {
  title: string;
  eyebrow?: string;
}) {
  // One step down for the longer headings so a four-word title and a
  // twelve-word title both fill the frame instead of one overflowing it.
  const titleSize = title.length > 56 ? 68 : title.length > 38 ? 80 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf7f2",
          padding: "72px 80px",
          fontFamily: "Instrument",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 24,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#78716c",
            }}
          >
            <div style={{ width: 56, height: 3, backgroundColor: "#7a1e2e" }} />
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: titleSize,
            lineHeight: 1.05,
            letterSpacing: "-0.022em",
            color: "#1c1917",
            maxWidth: 980,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid #e3dbcd",
            paddingTop: 28,
            fontSize: 28,
            color: "#57534e",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Fraunces", color: "#1c1917" }}>
            {siteConfig.name}
          </div>
          <div style={{ display: "flex" }}>newenglandeventplanners.com</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
