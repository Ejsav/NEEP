/**
 * Locates a usable Chromium for the browser checks.
 *
 * The Playwright package pins an expected browser build number, but this
 * environment ships whatever build it ships. Hardcoding a version (as the first
 * version of verify-slice1.mjs did) works until the image is rebuilt and then
 * fails with a misleading "run npx playwright install". Discovering the binary
 * keeps the checks running across image updates.
 *
 * Honours CHROMIUM_EXECUTABLE when set, so CI can pin one explicitly.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RELATIVE_CANDIDATES = [
  "chrome-linux/chrome",
  "chrome-linux64/chrome",
  "chrome-headless-shell-linux64/chrome-headless-shell",
];

export function resolveChromium() {
  const explicit = process.env.CHROMIUM_EXECUTABLE;
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(`CHROMIUM_EXECUTABLE is set but does not exist: ${explicit}`);
    }
    return explicit;
  }

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(root)) {
    throw new Error(
      `No browser directory at ${root}. Set PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_EXECUTABLE.`,
    );
  }

  // Prefer full chromium over the headless shell: the shell cannot do some of
  // the things the page-contract checks rely on.
  const entries = readdirSync(root).sort((a, b) => {
    const score = (name) => (name.startsWith("chromium-") ? 0 : 1);
    return score(a) - score(b) || b.localeCompare(a);
  });

  for (const entry of entries) {
    for (const relative of RELATIVE_CANDIDATES) {
      const candidate = join(root, entry, relative);
      if (existsSync(candidate)) return candidate;
    }
  }

  throw new Error(
    `No Chromium binary found under ${root}. Looked for ${RELATIVE_CANDIDATES.join(", ")}.`,
  );
}
