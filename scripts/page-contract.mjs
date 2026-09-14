/**
 * Page contract: the checks every public page must pass, on every public page.
 *
 * Routes are read from the live sitemap rather than a list maintained here, so
 * the checker covers exactly what we ask crawlers to index. A page that is in
 * the sitemap but fails a contract check is a page we are actively pointing
 * Google at while it is broken, which is the failure worth catching.
 *
 * Usage: node scripts/page-contract.mjs   (needs a built app running on :3000)
 */
import { chromium } from "playwright";
import { resolveChromium } from "./lib/chromium.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

/**
 * Copy rules, as patterns rather than substrings.
 *
 * The transportation rules are a legal boundary, not a style preference. CGS
 * 13b-101 turns on whether a business represents *itself* as being in the
 * business of transporting passengers for hire, and the trigger is advertising
 * conduct rather than ownership. See CLAUDE.md and docs/DECISIONS.md D-013.
 *
 * Grammatical subject is the whole point, which is why these are regexes. The
 * footer's standing disclosure says transportation is coordinated through
 * "independent, licensed and insured third-party carriers" - that sentence is
 * the compliance measure, and a blunt substring match for "licensed and
 * insured" flagged it as a violation. What is banned is the company claiming
 * those things about itself.
 *
 * The fabrication rules work the same way: an honest empty state may use the
 * word "testimonial", so what is banned is the fabricated claim, not the noun.
 */
const BANNED_PATTERNS = [
  // --- Transportation: holding out -------------------------------------
  { name: "company claims a fleet", re: /\bour (fleet|vehicles|drivers|buses|limos|coaches)\b/i },
  {
    name: "company as transportation operator",
    re: /\bwe (provide|offer|operate|run|drive|supply)\b[^.]{0,60}\b(transport\w*|shuttle|limo\w*|bus|buses|coach\w*|vehicle|car service)\b/i,
  },
  {
    name: "company claims licensing or insurance",
    re: /\b(we are|we're|we) (fully )?(licensed|insured|licensed and insured)\b/i,
  },
  {
    name: "brand claims licensing or insurance",
    re: /New England Event Planners (is|are) (fully )?(licensed|insured)/i,
  },
  // --- Fabricated proof -------------------------------------------------
  { name: "placeholder copy", re: /lorem ipsum/i },
  { name: "fabricated trust claim", re: /\btrusted by\b/i },
  { name: "fabricated rating", re: /\b\d+\+?\s*(five|5)[-\s]star\b|\b(five|5)[-\s]star (rated|reviews)\b/i },
  { name: "fabricated press", re: /\bas seen (in|on)\b|\bfeatured in\b/i },
  { name: "fabricated award", re: /\baward[-\s]winning\b/i },
  { name: "fabricated tenure", re: /\b\d+\+?\s*years (of )?experience\b|\bsince (19|20)\d{2}\b/i },
  { name: "fabricated volume", re: /\b\d[\d,]*\+?\s*(events|weddings|clients|couples) (planned|served|delivered)\b/i },
];

/**
 * `--color-paper` in each scheme, as the browser reports it. A mismatch means
 * the theme tokens are not switching, which is invisible in the source and
 * obvious here.
 */
const LIGHT_PAPER = "rgb(250, 247, 242)";
const DARK_PAPER = "rgb(22, 19, 15)";

/** Banned as a nav label regardless of surrounding copy. */
const BANNED_NAV_LABELS = ["fleet"];

const results = [];
let currentRoute = "";

function check(name, ok, detail = "") {
  results.push({ route: currentRoute, name, ok, detail });
  if (!ok) console.log(`FAIL  ${currentRoute}  ${name}${detail ? `  -- ${detail}` : ""}`);
}

async function routesFromSitemap() {
  const response = await fetch(`${BASE}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap.xml returned ${response.status}`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error("sitemap.xml listed no URLs");
  return urls.map((url) => new URL(url).pathname);
}


/**
 * Computed text contrast for every element whose own text is a leaf.
 *
 * Run against both colour schemes: a palette can satisfy AA in one and fail in
 * the other, and only the computed values know which. The background is the
 * nearest ancestor that actually paints one, because a transparent element
 * inherits whatever is behind it rather than the body.
 */
async function contrastProblems(page) {
  return page.evaluate(() => {
    const found = [];
    const describe = (el) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
        el.className && typeof el.className === "string"
          ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`
          : ""
      }`;
    const visible = (el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    // 8. Text contrast. The background is the nearest ancestor that paints one.
      const luminance = (rgb) => {
        const channel = (v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
      };
      const parse = (value) => {
        const m = value.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(",").map((n) => parseFloat(n));
        if (parts.length >= 4 && parts[3] === 0) return null; // transparent
        return [parts[0], parts[1], parts[2]];
      };
      const backgroundOf = (el) => {
        let node = el;
        while (node && node !== document.documentElement) {
          const rgb = parse(getComputedStyle(node).backgroundColor);
          if (rgb) return rgb;
          node = node.parentElement;
        }
        return parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255];
      };

      for (const el of document.querySelectorAll(
        "p, li, span, a, h1, h2, h3, h4, dt, dd, label, legend, button, strong, em, code, time",
      )) {
        if (!visible(el)) continue;
        // Only elements whose own text is the leaf, so a wrapper is not measured twice.
        const ownText = [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent.trim())
          .join("");
        if (ownText.length < 3) continue;

        const style = getComputedStyle(el);
        const fg = parse(style.color);
        if (!fg) continue;
        const bg = backgroundOf(el);
        const l1 = luminance(fg);
        const l2 = luminance(bg);
        const ratio =
          (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        const size = parseFloat(style.fontSize);
        const weight = Number(style.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const required = large ? 3 : 4.5;

        if (ratio < required) {
          found.push(
            `${describe(el)} ${ratio.toFixed(2)}:1 (needs ${required}) "${ownText.slice(0, 28)}"`,
          );
        }
      }
    return found;
  });
}

async function checkRoute(browser, route) {
  currentRoute = route;
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    // Pinned so the palette check below is deterministic. Chromium's own
    // default has changed between versions.
    colorScheme: "light",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  const response = await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  // Next prefetches an RSC payload for every visible <Link>, so "networkidle"
  // never settles. Wait for the document, then give prefetch a moment to land.
  await page.waitForLoadState("load");
  await page.waitForTimeout(750);

  check("responds 200", response?.status() === 200, `status=${response?.status()}`);

  // --- Headings -----------------------------------------------------------
  const headings = await page.$$eval("h1,h2,h3,h4,h5,h6", (nodes) =>
    nodes.map((n) => ({ level: Number(n.tagName[1]), text: n.textContent?.trim() ?? "" })),
  );
  const h1s = headings.filter((h) => h.level === 1);
  check("exactly one h1", h1s.length === 1, `found ${h1s.length}`);
  check("h1 is not empty", (h1s[0]?.text ?? "").length > 0);

  let skip = null;
  for (let i = 1; i < headings.length; i += 1) {
    const jump = headings[i].level - headings[i - 1].level;
    if (jump > 1) {
      skip = `h${headings[i - 1].level} -> h${headings[i].level} ("${headings[i].text.slice(0, 40)}")`;
      break;
    }
  }
  check("heading levels never skip", skip === null, skip ?? "");

  // --- Metadata -----------------------------------------------------------
  const canonical = await page.getAttribute('link[rel="canonical"]', "href");
  check("canonical present", Boolean(canonical), canonical ?? "missing");
  if (canonical) {
    check(
      "canonical matches route",
      new URL(canonical).pathname === route,
      `${new URL(canonical).pathname} != ${route}`,
    );
  }

  const title = (await page.title()).trim();
  // 60 is roughly where Google truncates; 65 leaves a little room for a long
  // page name without letting a title run away.
  check("title within 65 chars", title.length > 0 && title.length <= 65, `${title.length} chars: "${title}"`);

  const description = await page.getAttribute('meta[name="description"]', "content");
  check("description present", Boolean(description && description.trim().length > 0));

  const robots = (await page.getAttribute('meta[name="robots"]', "content")) ?? "";
  check("indexable", !/noindex/i.test(robots), robots || "(no robots meta)");

  // --- Layout -------------------------------------------------------------
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check(
    "no horizontal overflow at 375px",
    scrollWidth <= clientWidth,
    `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`,
  );

  // --- Copy rules ---------------------------------------------------------
  const bodyText = (await page.textContent("body")) ?? "";
  const found = BANNED_PATTERNS.filter((rule) => rule.re.test(bodyText));
  check(
    "no banned copy",
    found.length === 0,
    found.map((rule) => `${rule.name}: "${bodyText.match(rule.re)?.[0]}"`).join("; "),
  );

  const navLabels = await page.$$eval("nav a, header a", (nodes) =>
    nodes.map((n) => (n.textContent ?? "").trim().toLowerCase()),
  );
  const badNav = navLabels.filter((label) => BANNED_NAV_LABELS.includes(label));
  check("no banned nav labels", badNav.length === 0, badNav.join(", "));

  // --- Accessibility basics ----------------------------------------------
  const unlabelledImages = await page.$$eval("img", (nodes) =>
    nodes.filter((n) => !n.hasAttribute("alt")).length,
  );
  check("every image has an alt attribute", unlabelledImages === 0, `${unlabelledImages} missing`);

  const lang = await page.getAttribute("html", "lang");
  check("html lang set", Boolean(lang), lang ?? "missing");

  // --- Accessibility -------------------------------------------------------
  // Deterministic DOM checks rather than a bundled auditor: this environment
  // cannot fetch axe at runtime, and the failures worth catching on a site of
  // this shape - an unnamed control, a label pointing at nothing, an aria
  // reference to a missing id - are all decidable from the tree itself.
  const a11y = await page.evaluate(() => {
    const problems = {
      unnamedControls: [],
      unlabelledFields: [],
      danglingAria: [],
      duplicateIds: [],
      positiveTabindex: [],
      deadLinks: [],
      smallTargets: [],
    };

    const describe = (el) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
        el.className && typeof el.className === "string"
          ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`
          : ""
      }`;

    const visible = (el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // 1. Every interactive control exposes a name.
    for (const el of document.querySelectorAll("a[href], button")) {
      if (!visible(el)) continue;
      const name = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.getAttribute("title") ||
        el.querySelector("img")?.getAttribute("alt") ||
        ""
      ).trim();
      if (name === "") problems.unnamedControls.push(describe(el));
    }

    // 2. Every form control is labelled.
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (el.type === "hidden") continue;
      const labelled =
        el.labels?.length > 0 ||
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        el.closest("label") ||
        (el.closest("fieldset")?.querySelector("legend")?.textContent ?? "").trim() !== "";
      if (!labelled) problems.unlabelledFields.push(describe(el));
    }

    // 3. aria-describedby / aria-labelledby must resolve.
    for (const attribute of ["aria-describedby", "aria-labelledby", "aria-controls"]) {
      for (const el of document.querySelectorAll(`[${attribute}]`)) {
        for (const id of el.getAttribute(attribute).split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) {
            problems.danglingAria.push(`${describe(el)} ${attribute}="${id}"`);
          }
        }
      }
    }

    // 4. Duplicate ids break every one of those references.
    const seen = new Set();
    for (const el of document.querySelectorAll("[id]")) {
      if (seen.has(el.id)) problems.duplicateIds.push(el.id);
      seen.add(el.id);
    }

    // 5. A positive tabindex reorders the whole page for keyboard users.
    for (const el of document.querySelectorAll("[tabindex]")) {
      if (Number(el.getAttribute("tabindex")) > 0) problems.positiveTabindex.push(describe(el));
    }

    // 6. Links that go nowhere.
    for (const el of document.querySelectorAll("a")) {
      const href = el.getAttribute("href");
      if (href === null || href.trim() === "" || href === "#") {
        problems.deadLinks.push(describe(el));
      }
    }

    // 7. WCAG 2.2 target size (minimum): 24x24 CSS px, unless spacing exempts it.
    //    Checked only on the controls a visitor actually operates.
    for (const el of document.querySelectorAll("a[href], button, input, select, textarea")) {
      if (!visible(el)) continue;
      if (el.closest("p, li, dd, dt, nav")) continue; // inline links are exempt
      // A control wrapped in a label is not the target - the label is, and the
      // whole of it is clickable. Measuring the 20px radio inside a 90px card
      // reports a failure that does not exist for anyone using the page.
      const label = el.closest("label");
      const rect = (label ?? el).getBoundingClientRect();
      if (rect.height < 24 || rect.width < 24) {
        problems.smallTargets.push(`${describe(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }

    return problems;
  });

  check("every link and button has an accessible name", a11y.unnamedControls.length === 0, a11y.unnamedControls.slice(0, 3).join(", "));
  check("every form control is labelled", a11y.unlabelledFields.length === 0, a11y.unlabelledFields.slice(0, 3).join(", "));
  check("every aria reference resolves", a11y.danglingAria.length === 0, a11y.danglingAria.slice(0, 3).join(", "));
  check("no duplicate ids", a11y.duplicateIds.length === 0, a11y.duplicateIds.slice(0, 3).join(", "));
  check("no positive tabindex", a11y.positiveTabindex.length === 0, a11y.positiveTabindex.slice(0, 3).join(", "));
  check("no dead links", a11y.deadLinks.length === 0, a11y.deadLinks.slice(0, 3).join(", "));
  check("targets are at least 24x24", a11y.smallTargets.length === 0, a11y.smallTargets.slice(0, 3).join(", "));

  const contrast = await contrastProblems(page);
  check("text meets WCAG AA contrast", contrast.length === 0, contrast.slice(0, 4).join(" | "));

  const landmarks = await page.evaluate(() => ({
    mains: document.querySelectorAll("main, [role=main]").length,
    skip: (() => {
      const link = document.querySelector("a.skip-link, a[href^='#main']");
      if (!link) return "missing";
      const target = document.querySelector(link.getAttribute("href"));
      return target ? "ok" : "points at nothing";
    })(),
  }));
  check("exactly one main landmark", landmarks.mains === 1, `found ${landmarks.mains}`);
  check("skip link resolves to the main landmark", landmarks.skip === "ok", landmarks.skip);

  // --- Palette ------------------------------------------------------------
  // Tailwind v4 resolves `@theme` at build time and flattens it to the top
  // level, so a `@theme` written inside `@media (prefers-color-scheme: dark)`
  // loses its condition and paints every visitor dark. That shipped once. This
  // asserts the compiled result rather than the source, which is the only
  // version that can be wrong.
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  check(
    "light scheme renders the light palette",
    background === LIGHT_PAPER,
    `body background is ${background}, expected ${LIGHT_PAPER}`,
  );

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

  await context.close();
}

/**
 * The other half of the palette check: prove the dark tokens are reachable at
 * all. A build that hardcoded the light values would pass every per-route check
 * above and still have no dark mode.
 */
async function checkDarkScheme(browser) {
  currentRoute = "/ (dark scheme)";
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  check(
    "dark scheme renders the dark palette",
    background === DARK_PAPER,
    `body background is ${background}, expected ${DARK_PAPER}`,
  );

  for (const route of ["/", "/plan", "/pricing"]) {
    currentRoute = `${route} (dark scheme)`;
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    const contrast = await contrastProblems(page);
    check("text meets WCAG AA contrast", contrast.length === 0, contrast.slice(0, 4).join(" | "));
  }

  await context.close();
}

async function main() {
  const routes = await routesFromSitemap();
  console.log(`Page contract — ${BASE}`);
  console.log(`${routes.length} indexable route(s) from sitemap.xml: ${routes.join(", ")}\n`);

  const browser = await chromium.launch({ executablePath: resolveChromium() });
  try {
    for (const route of routes) await checkRoute(browser, route);
    await checkDarkScheme(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  const byRoute = new Map();
  for (const r of results) byRoute.set(r.route, (byRoute.get(r.route) ?? 0) + 1);
  for (const [route, count] of byRoute) {
    const bad = failed.filter((f) => f.route === route).length;
    console.log(`${bad === 0 ? "PASS" : "FAIL"}  ${route}  (${count - bad}/${count})`);
  }

  console.log(`\n${results.length - failed.length}/${results.length} contract checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("page-contract failed to run:", error.message ?? error);
  process.exit(1);
});
