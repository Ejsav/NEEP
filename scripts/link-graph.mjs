/**
 * Internal link graph: no indexable page may be unreachable, and none should
 * depend on the footer alone.
 *
 * PLAN.md promised this check in P0 and it was never built, so the failure it
 * exists to catch has been live the whole time: /venues is linked from exactly
 * one page, /guides/[region], which is itself unlinked. A page Google can only
 * find through the sitemap is a page Google has no reason to rank.
 *
 * Two thresholds, because "linked" is not one thing:
 *
 *  - Reachable. At least one inbound link from another indexed page. Zero is a
 *    hard failure: the page is an island.
 *  - Contextual. At least one inbound link from OUTSIDE the header and footer.
 *    Site chrome links every page it lists from every page there is, so a
 *    footer link proves nothing about whether the page belongs to the site's
 *    argument. Pages that legitimately live in the chrome are named below with
 *    the reason.
 *
 * Usage: node scripts/link-graph.mjs   (needs a built app running on :3000)
 */
import { chromium } from "playwright";
import { resolveChromium } from "./lib/chromium.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

/**
 * Routes allowed to be reachable only through the header or footer, and why.
 * Every entry is a deliberate decision, not a backlog item.
 */
const CHROME_ONLY_ALLOWED = new Map([
  ["/privacy", "Legal. Belongs in the footer and nowhere else."],
  ["/terms", "Legal. Belongs in the footer and nowhere else."],
  ["/accessibility", "Legal. Belongs in the footer and nowhere else."],
]);

const results = [];
function check(route, name, ok, detail = "") {
  results.push({ route, name, ok, detail });
  if (!ok) console.log(`FAIL  ${route}  ${name}${detail ? `  -- ${detail}` : ""}`);
}

async function routesFromSitemap() {
  const response = await fetch(`${BASE}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap.xml returned ${response.status}`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error("sitemap.xml listed no URLs");
  return urls.map((url) => new URL(url).pathname);
}

/** Same-origin link targets on one page, split by whether they sit in chrome. */
async function linksOn(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load");

  return page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => {
        const href = a.getAttribute("href") ?? "";
        // Only same-origin document links. Skip mailto:, tel:, anchors and
        // anything pointing off-site.
        if (!href.startsWith("/")) return null;
        const path = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
        return {
          path,
          chrome: Boolean(a.closest("header, footer")),
        };
      })
      .filter(Boolean),
  );
}

async function main() {
  const routes = await routesFromSitemap();

  console.log(`Link graph — ${BASE}`);
  console.log(`${routes.length} indexable route(s)\n`);

  /** target -> { total, contextual, from: Set<source> } */
  const inbound = new Map(
    routes.map((r) => [r, { total: 0, contextual: 0, from: new Set() }]),
  );

  const browser = await chromium.launch({ executablePath: resolveChromium() });
  try {
    const page = await browser.newPage();
    for (const source of routes) {
      for (const link of await linksOn(page, source)) {
        // A page linking to itself proves nothing.
        if (link.path === source) continue;
        const entry = inbound.get(link.path);
        if (!entry) continue; // points somewhere not indexed; not this check's business
        entry.total += 1;
        if (!link.chrome) entry.contextual += 1;
        entry.from.add(source);
      }
    }
  } finally {
    await browser.close();
  }

  for (const route of routes) {
    const entry = inbound.get(route);
    // The homepage is reached by the wordmark from every page; requiring a
    // contextual inbound link to it would be pedantry.
    if (route === "/") {
      check(route, "reachable", entry.total > 0, `${entry.total} inbound`);
      continue;
    }

    check(
      route,
      "reachable from another indexed page",
      entry.total > 0,
      `${entry.total} inbound from ${entry.from.size} page(s)`,
    );

    const allowed = CHROME_ONLY_ALLOWED.get(route);
    check(
      route,
      "linked from page content, not only site chrome",
      entry.contextual > 0 || Boolean(allowed),
      entry.contextual === 0
        ? allowed
          ? `chrome-only, allowed: ${allowed}`
          : "only linked from the header or footer"
        : `${entry.contextual} contextual`,
    );
  }

  console.log("");
  for (const route of routes) {
    const entry = inbound.get(route);
    const bad = results.filter((r) => r.route === route && !r.ok).length;
    console.log(
      `${bad === 0 ? "PASS" : "FAIL"}  ${route}  ${entry.total} inbound (${entry.contextual} contextual)`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} link checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("link-graph failed to run:", error.message ?? error);
  process.exit(1);
});
