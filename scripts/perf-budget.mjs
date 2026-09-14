/**
 * Route performance budget, measured rather than asserted.
 *
 * Loads each public route in a real browser and records what the network
 * actually transferred. Two deliberate choices:
 *
 *  1. Sizes come from request.sizes().responseBodySize, which is the ENCODED
 *     size sent over the wire. response.body() returns the decompressed buffer
 *     and over-reports a gzipped chunk by roughly 3x.
 *
 *  2. The headline number is ROUTE-ADDED JavaScript, not first-load JavaScript.
 *     React 19 + the Next 16 App Router runtime are a fixed ~134 KB floor that
 *     no amount of discipline in this codebase can move; budgeting against a
 *     number below that floor would just be permanently red. What we actually
 *     control is how much each route adds on top, and that is what is held to a
 *     tight budget. The first-load ceiling is kept as a backstop so a framework
 *     regression is still caught.
 *
 * Budgets come from PLAN.md section 6. Exceeding one fails the build.
 *
 * Usage: node scripts/perf-budget.mjs   (needs a built app running on :3000)
 */
import { chromium } from "playwright";
import { resolveChromium } from "./lib/chromium.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const KB = 1024;

/**
 * addedJs  - KB of JavaScript this route loads beyond the shared framework.
 * firstLoad- KB ceiling for all JavaScript on the route (framework included).
 * total    - KB ceiling for every resource on the route.
 */
const BUDGETS = [
  // next/image adds roughly 5KB of client JS to any route that uses it, which
  // is why the pillar routes are held here rather than assumed to match the
  // homepage.
  { path: "/", addedJs: 12, firstLoad: 148, total: 800 },
  { path: "/weddings", addedJs: 12, firstLoad: 148, total: 700 },
  { path: "/corporate-events", addedJs: 12, firstLoad: 148, total: 700 },
  { path: "/plan", addedJs: 25, firstLoad: 160, total: 500 },
  { path: "/venues", addedJs: 12, firstLoad: 148, total: 900 },
];

async function measure(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  const scripts = new Map();
  let totalBytes = 0;
  const consoleErrors = [];
  const pending = [];

  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // requestfinished, not response: sizes() is only populated once the transfer
  // completes.
  page.on("requestfinished", (request) => {
    pending.push(
      (async () => {
        const sizes = await request.sizes().catch(() => null);
        if (!sizes) return;
        const size = sizes.responseBodySize;
        totalBytes += size;
        if (request.resourceType() === "script") {
          scripts.set(request.url(), size);
        }
      })(),
    );
  });

  const response = await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  // Next prefetches an RSC payload for every visible <Link>, so "networkidle"
  // never settles. Wait for the document, then give prefetch a moment to land.
  await page.waitForLoadState("load");
  await page.waitForTimeout(750);
  if (!response || !response.ok()) {
    throw new Error(`${route} returned ${response ? response.status() : "no response"}`);
  }
  await Promise.all(pending);
  await context.close();
  return { scripts, totalBytes, consoleErrors };
}

async function main() {
  const browser = await chromium.launch({ executablePath: resolveChromium() });
  const measured = [];

  try {
    for (const budget of BUDGETS) {
      measured.push({ budget, ...(await measure(browser, budget.path)) });
    }
  } finally {
    await browser.close();
  }

  // The shared framework baseline is the set of scripts every route loads.
  const shared = [...measured[0].scripts.keys()].filter((url) =>
    measured.every((m) => m.scripts.has(url)),
  );
  const sharedBytes = shared.reduce((sum, url) => sum + measured[0].scripts.get(url), 0);

  console.log(`Performance budget — ${BASE}`);
  console.log(
    `Shared framework baseline: ${(sharedBytes / KB).toFixed(1)} KB ` +
      `across ${shared.length} chunks\n`,
  );
  console.log(
    "route".padEnd(12) +
      "added JS".padStart(11) +
      "budget".padStart(9) +
      "first load".padStart(12) +
      "budget".padStart(9) +
      "total".padStart(11) +
      "budget".padStart(9) +
      "  status",
  );
  console.log("-".repeat(83));

  let failed = false;

  for (const { budget, scripts, totalBytes, consoleErrors } of measured) {
    const jsBytes = [...scripts.values()].reduce((a, b) => a + b, 0);
    const addedJs = (jsBytes - sharedBytes) / KB;
    const firstLoad = jsBytes / KB;
    const total = totalBytes / KB;

    const breaches = [];
    if (addedJs > budget.addedJs) breaches.push("added JS");
    if (firstLoad > budget.firstLoad) breaches.push("first load");
    if (total > budget.total) breaches.push("total");
    if (consoleErrors.length > 0) breaches.push("console errors");
    if (breaches.length > 0) failed = true;

    console.log(
      budget.path.padEnd(12) +
        `${addedJs.toFixed(1)} KB`.padStart(11) +
        `${budget.addedJs} KB`.padStart(9) +
        `${firstLoad.toFixed(1)} KB`.padStart(12) +
        `${budget.firstLoad} KB`.padStart(9) +
        `${total.toFixed(1)} KB`.padStart(11) +
        `${budget.total} KB`.padStart(9) +
        (breaches.length > 0 ? `  FAIL (${breaches.join(", ")})` : "  ok"),
    );
    for (const error of consoleErrors) {
      console.log(`             console error: ${error}`);
    }
  }

  if (failed) {
    console.log("\nBudget exceeded. See PLAN.md section 6.");
    process.exit(1);
  }
  console.log("\nAll routes within budget.");
}

main().catch((error) => {
  console.error("perf-budget failed to run:", error.message ?? error);
  process.exit(1);
});
