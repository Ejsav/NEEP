/**
 * Slice 1 browser verification. Drives the real production server against the
 * real database and reports pass/fail per acceptance criterion.
 *
 * Run with `pnpm verify:e2e`, which first clears rate_limit_buckets. That reset
 * is setup, not a bypass: this script submits the public form several times per
 * run and would otherwise trip the genuine 5-per-hour per-IP limit on the
 * second run. The limiter itself is covered by tests/money-path.test.ts.
 *
 * Requires: a built app served on :3000, and DATABASE_URL pointing at it.
 */
import { chromium } from "playwright";
import { resolveChromium } from "./lib/chromium.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

/**
 * Admin credentials come from the environment. Nothing that can sign in to a
 * real deployment is ever committed, dev-only or not.
 */
const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Set VERIFY_ADMIN_EMAIL and VERIFY_ADMIN_PASSWORD to an admin account " +
      "created with `pnpm admin:create`.",
  );
  process.exit(1);
}
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -- ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath: resolveChromium() });

const consoleErrors = [];
const pageErrors = [];
/**
 * Failed requests, recorded with their URL.
 *
 * "Failed to load resource" in the console names no URL, which makes a 404
 * fired from a prefetch on a previous page effectively undebuggable. Recording
 * the response separately is what turns that into an actionable line.
 */
const failedRequests = [];

async function newCtx(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ...opts });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`);
  });
  page.on("pageerror", (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  return { ctx, page };
}

async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return { scroll: de.scrollWidth, client: de.clientWidth };
  });
  check(
    `${label}: no horizontal overflow at 375px`,
    overflow.scroll <= overflow.client + 1,
    `scrollWidth=${overflow.scroll} clientWidth=${overflow.client}`,
  );
}

// ---------------------------------------------------------------- 1. Homepage
{
  const { ctx, page } = await newCtx();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  await noOverflow(page, "home");

  const h1s = await page.locator("h1").allTextContents();
  check("home: exactly one h1", h1s.length === 1, JSON.stringify(h1s));

  const headingOrder = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1])),
  );
  let ordered = true;
  for (let i = 1; i < headingOrder.length; i += 1) {
    if (headingOrder[i] - headingOrder[i - 1] > 1) ordered = false;
  }
  check("home: no skipped heading levels", ordered, headingOrder.join(","));

  const canonical = await page.getAttribute('link[rel="canonical"]', "href");
  check("home: canonical present", Boolean(canonical), String(canonical));

  const robots = await page.getAttribute('meta[name="robots"]', "content");
  check("home: indexable", !String(robots).includes("noindex"), String(robots));

  const title = await page.title();
  check("home: has a title", title.length > 10, title);

  const desc = await page.getAttribute('meta[name="description"]', "content");
  check("home: has a description", Boolean(desc) && desc.length > 40, String(desc).slice(0, 60));

  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  const parsed = JSON.parse(ld);
  check("home: Organization schema, not LocalBusiness", parsed["@type"] === "Organization", parsed["@type"]);
  check(
    "home: schema declares no address and no rating",
    !("address" in parsed) && !("aggregateRating" in parsed),
    Object.keys(parsed).join(","),
  );

  // No fabricated proof anywhere in the rendered copy.
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  const banned = ["lorem ipsum", "testimonial", "5-star", "trusted by", "as seen in", "our fleet", "our vehicles", "our drivers"];
  const found = banned.filter((b) => bodyText.includes(b));
  check("home: no fabricated proof or carrier language", found.length === 0, found.join(","));

  check(
    "home: transportation disclosure present",
    bodyText.includes("do not own vehicles") || bodyText.includes("does not own vehicles"),
  );

  await ctx.close();
}

// -------------------------------------------- 2. Attribution + form submission
const submittedRef = { value: null };
{
  const { ctx, page } = await newCtx();

  // Visit 1: paid search landing, sets first + last touch.
  await page.goto(
    `${BASE}/?utm_source=google&utm_medium=cpc&utm_campaign=ct-weddings-2026&gclid=BROWSERTEST123`,
    { waitUntil: "networkidle" },
  );
  // Visit 2: internal navigation, must NOT overwrite last touch.
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle" });

  await noOverflow(page, "plan");

  const cookies = await ctx.cookies();
  check(
    "attribution: all three cookies set and HttpOnly",
    ["neep_ft", "neep_lt", "neep_v"].every((n) => {
      const c = cookies.find((x) => x.name === n);
      return c && c.httpOnly;
    }),
    cookies.map((c) => c.name).join(","),
  );

  const h1 = await page.locator("h1").allTextContents();
  check("plan: exactly one h1", h1.length === 1, JSON.stringify(h1));

  const canonical = await page.getAttribute('link[rel="canonical"]', "href");
  check("plan: canonical present", String(canonical).endsWith("/plan"), String(canonical));

  // Every input has an associated label.
  const unlabelled = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (el.type === "hidden") continue;
      const id = el.id;
      const hasLabel =
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        el.closest("label") ||
        el.getAttribute("aria-label");
      if (!hasLabel) bad.push(el.name || el.id || el.tagName);
    }
    return bad;
  });
  check("plan: every control is labelled", unlabelled.length === 0, unlabelled.join(","));

  const honeypot = await page.evaluate(() => {
    const el = document.querySelector('input[name="company_website"]');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const wrapper = el.parentElement;
    const cs = wrapper ? getComputedStyle(wrapper) : null;
    return {
      offscreen: box.right < 0 || box.bottom < 0,
      hiddenFromAT: wrapper?.getAttribute("aria-hidden") === "true",
      outOfTabOrder: el.getAttribute("tabindex") === "-1",
      transparent: cs?.opacity === "0",
    };
  });
  check(
    "plan: honeypot is off-screen, transparent, aria-hidden and untabbable",
    Boolean(
      honeypot?.offscreen &&
        honeypot?.hiddenFromAT &&
        honeypot?.outOfTabOrder &&
        honeypot?.transparent,
    ),
    JSON.stringify(honeypot),
  );

  // Walk the wizard. Inactive steps are `inert`, so their controls are
  // deliberately unreachable until the visitor actually gets there - which is
  // the behaviour being verified as much as it is a means of filling the form.
  async function continueStep() {
    await page.locator(".planner-nav button", { hasText: "Continue" }).click();
  }

  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 280);

  // Step 1 - event type.
  await page.locator('input[name="eventType"][value="wedding"]').check();
  check(
    "planner: later steps are inert until reached",
    await page.locator('[data-planner-step="5"]').evaluate((n) => n.hidden && n.inert),
  );
  await continueStep();

  // Step 2 - date and size.
  await page.fill('input[name="eventDate"]', d.toISOString().slice(0, 10));
  await page.fill('input[name="guestCountMin"]', "110");
  await page.fill('input[name="guestCountMax"]', "150");
  await page.fill('input[name="eventTown"]', "Mystic");
  await continueStep();

  // Step 3 - venue.
  await page.locator('input[name="venueStatus"][value="need_help"]').check();
  await continueStep();

  // Give the fire-and-forget draft save time to land before moving on.
  await page.waitForTimeout(600);

  // Step 4 - scope, budget, modules.
  await page.locator('input[name="scopeTier"][value="full_planning"]').check();
  await page.locator('input[name="budgetBand"][value="50k_100k"]').check();
  await page.locator('input[name="servicesNeeded"][value="venue_sourcing"]').check();
  await page
    .locator('input[name="servicesNeeded"][value="guest_transport_coordination"]')
    .check();
  await continueStep();

  // Step 5 - contact, the only PII in the flow.
  const progress = await page.locator('[role="progressbar"]').getAttribute("aria-valuenow");
  check("planner: progress tracks the final step", progress === "5", String(progress));

  await page.fill('input[name="firstName"]', "Priya");
  await page.fill('input[name="lastName"]', "Raghunathan");
  await page.fill('input[name="email"]', "browser-verify@example.com");
  await page.fill('input[name="phone"]', "(860) 555-0147");
  await page.fill('textarea[name="message"]', "Shoreline wedding, need shuttle logistics.");

  // The form token enforces a minimum fill time; a real person takes longer.
  await page.waitForTimeout(3000);
  await page.locator('.planner-nav button[type="submit"]').click();
  await page.waitForSelector('[role="status"]', { timeout: 15000 });

  const receipt = await page.locator('[role="status"]').innerText();
  const m = receipt.match(/NEEP-[0-9A-Z]{6}/);
  submittedRef.value = m ? m[0] : null;
  check("submit: success receipt with a reference", Boolean(submittedRef.value), submittedRef.value ?? receipt.slice(0, 120));
  check("submit: receipt states the response commitment", /within \d+ hours/.test(receipt));

  await noOverflow(page, "plan (receipt)");
  await ctx.close();
}

// ----------------------------------- 3. Server validation, with JavaScript off
//
// Run without JavaScript on purpose. It exercises the progressive-enhancement
// contract directly: with no JS the planner is one long form with a single
// submit, native validation is suppressed at form level so the request actually
// reaches the server, and the server's answer is what the visitor sees.
{
  const { ctx, page } = await newCtx({ javaScriptEnabled: false });
  await page.goto(`${BASE}/plan`, { waitUntil: "domcontentloaded" });

  const stepState = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("[data-planner-step]")];
    return {
      count: nodes.length,
      anyHidden: nodes.some((n) => n.hidden),
      navVisible: Boolean(
        document.querySelector(".planner-nav") &&
          getComputedStyle(document.querySelector(".planner-nav")).display !== "none",
      ),
      submitVisible: Boolean(
        document.querySelector(".planner-submit") &&
          getComputedStyle(document.querySelector(".planner-submit")).display !== "none",
      ),
    };
  });
  check("no-JS: all five steps are visible", stepState.count === 5 && !stepState.anyHidden, JSON.stringify(stepState));
  check("no-JS: wizard navigation is not shown", stepState.navVisible === false);
  check("no-JS: a real submit button is shown", stepState.submitVisible === true);

  // The form token enforces a minimum fill time before every submit, including
  // this one. A page re-rendered by a rejected post carries a fresh token, so
  // each attempt below needs its own wait.
  await page.waitForTimeout(3000);
  await page.locator('.planner-submit button[type="submit"]').click();
  await page.waitForSelector("[data-form-error]", { timeout: 15000 });

  const alert = await page.locator("[data-form-error]").innerText();
  check("no-JS: server rejects an empty submission", alert.length > 0, alert.slice(0, 80));

  const fieldErrors = await page.locator("p.text-critical").allTextContents();
  check(
    "no-JS: errors render next to fields",
    fieldErrors.filter((t) => t.trim()).length >= 3,
    String(fieldErrors.filter((t) => t.trim()).length),
  );

  const invalidCount = await page.locator('[aria-invalid="true"]').count();
  check("no-JS: invalid fields carry aria-invalid", invalidCount >= 3, String(invalidCount));

  // Values must survive a rejected submission.
  await page.fill('input[name="firstName"]', "Keeps");
  await page.fill('input[name="email"]', "not-an-email");
  await page.waitForTimeout(3000);
  await page.locator('.planner-submit button[type="submit"]').click();
  await page.waitForSelector("[data-form-error]", { timeout: 15000 });
  const kept = await page.inputValue('input[name="firstName"]');
  check("no-JS: typed values survive a rejection", kept === "Keeps", kept);

  // And a complete no-JS submission must actually save a lead.
  const nd = new Date();
  nd.setUTCDate(nd.getUTCDate() + 200);
  await page.locator('input[name="eventType"][value="corporate"]').check();
  await page.fill('input[name="eventDate"]', nd.toISOString().slice(0, 10));
  await page.fill('input[name="guestCountMin"]', "60");
  await page.fill('input[name="guestCountMax"]', "80");
  await page.fill('input[name="eventTown"]', "Hartford");
  await page.locator('input[name="venueStatus"][value="shortlisted"]').check();
  await page.locator('input[name="scopeTier"][value="partial_planning"]').check();
  await page.locator('input[name="budgetBand"][value="25k_50k"]').check();
  await page.fill('input[name="firstName"]', "Nojs");
  await page.fill('input[name="lastName"]', "Submitter");
  await page.fill('input[name="email"]', "nojs-verify@example.com");
  await page.waitForTimeout(3000);
  await page.locator('.planner-submit button[type="submit"]').click();
  await page.waitForSelector('[role="status"]', { timeout: 15000 });

  const noJsReceipt = await page.locator('[role="status"]').innerText();
  const noJsRef = noJsReceipt.match(/NEEP-[0-9A-Z]{6}/);
  check("no-JS: a complete submission saves a lead", Boolean(noJsRef), noJsRef ? noJsRef[0] : noJsReceipt.slice(0, 120));

  await ctx.close();
}

// ---------------------------------------------------------- 4. Keyboard only
{
  const { ctx, page } = await newCtx({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle" });

  // Tab from the top and confirm focus reaches the submit button without a trap.
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => document.activeElement?.className ?? "");
  check("keyboard: first stop is the skip link", firstFocus.includes("skip-link"), firstFocus.slice(0, 40));

  let reachedSubmit = false;
  let focusRingSeen = false;
  for (let i = 0; i < 90; i += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        type: el.getAttribute("type"),
        text: (el.textContent ?? "").trim(),
        outline: cs.outlineStyle !== "none" && cs.outlineWidth !== "0px",
      };
    });
    if (!info) break;
    if (info.outline) focusRingSeen = true;
    if (info.tag === "BUTTON" && (info.type === "submit" || info.text === "Continue")) {
      reachedSubmit = true;
      break;
    }
  }
  check("keyboard: the step's primary action is reachable by Tab", reachedSubmit);
  check("keyboard: focus is visibly indicated", focusRingSeen);

  // Complete the whole flow with the keyboard only.
  await page.evaluate(() => document.querySelector("h1")?.scrollIntoView());
  await page.locator('input[name="eventType"][value="private"]').focus();
  await page.keyboard.press("Space");
  const checked = await page.locator('input[name="eventType"][value="private"]').isChecked();
  check("keyboard: radio selectable with Space", checked);

  await ctx.close();
}

// ------------------------------------------------------------- 5. Admin auth
{
  const { ctx, page } = await newCtx({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/admin/inquiries`, { waitUntil: "networkidle" });
  check("admin: unauthenticated access redirects to login", page.url().includes("/admin/login"), page.url());

  await page.goto(`${BASE}/admin/inquiries/00000000-0000-0000-0000-000000000000`, {
    waitUntil: "networkidle",
  });
  check("admin: detail route also gated", page.url().includes("/admin/login"), page.url());

  const adminRobots = await page.getAttribute('meta[name="robots"]', "content");
  check("admin: noindex meta present", String(adminRobots).includes("noindex"), String(adminRobots));

  // Wrong password.
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', "wrong-password");
  await page.waitForTimeout(2800);
  await page.click('button[type="submit"]');
  await page.waitForSelector("[data-login-error]", { timeout: 15000 });
  const err = await page.locator("[data-login-error]").innerText();
  check("admin: wrong password rejected", err.length > 0, err.slice(0, 60));
  check(
    "admin: error does not reveal whether the account exists",
    !/no such|not found|unknown user|inactive/i.test(err),
    err.slice(0, 60),
  );

  check(
    "admin: email is preserved after a failed attempt",
    (await page.inputValue('input[name="email"]')) === ADMIN_EMAIL,
    await page.inputValue('input[name="email"]'),
  );

  // Correct password.
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.waitForTimeout(2800);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/inquiries", { timeout: 15000 });
  check("admin: correct credentials sign in", page.url().includes("/admin/inquiries"), page.url());

  const sessionCookie = (await ctx.cookies()).find((c) => c.name.includes("neep_admin"));
  check("admin: session cookie is HttpOnly", Boolean(sessionCookie?.httpOnly));

  const listText = await page.locator("body").innerText();
  check(
    "admin: submitted inquiry appears in the list",
    submittedRef.value ? listText.includes(submittedRef.value) : false,
    submittedRef.value ?? "no reference captured",
  );
  check(
    "admin: unconfigured email is disclosed honestly",
    listText.includes("Email notifications are not configured"),
  );

  // Open the detail page and confirm attribution round-tripped through cookies.
  if (submittedRef.value) {
    // Click the row link, then wait for the URL itself. `networkidle` resolves
    // too early here: Next aborts its in-flight RSC prefetch on click, which
    // looks like idle before the destination has rendered.
    await page
      .locator('a[href^="/admin/inquiries/"]', { hasText: submittedRef.value })
      .first()
      .click();
    await page.waitForURL(/\/admin\/inquiries\/[0-9a-f-]{36}/, { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    const detail = await page.locator("body").innerText();
    check("admin detail: shows the customer", detail.includes("Priya"));
    check("admin detail: first touch source captured", detail.includes("google"));
    check("admin detail: campaign captured", detail.includes("ct-weddings-2026"));
    check("admin detail: click id captured", detail.includes("BROWSERTEST123"));
    check("admin detail: submitted-from path captured", detail.includes("/plan"));
    check(
      "admin detail: notification status is honest",
      detail.includes("no email provider configured") ||
        detail.includes("No notification was recorded"),
    );
    check("admin detail: raw IP not displayed", !detail.includes("203.0.113"));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await noOverflow(page, "admin detail");
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/admin/inquiries`, { waitUntil: "networkidle" });
  await noOverflow(page, "admin list");

  await ctx.close();
}

// ------------------------------------------- 6. No secrets in client bundles
{
  const { ctx, page } = await newCtx();
  const scripts = [];
  page.on("response", async (r) => {
    if (r.url().endsWith(".js")) {
      try {
        scripts.push(await r.text());
      } catch {}
    }
  });
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle" });
  const all = scripts.join("\n");
  // Needles are read from the live environment, so this asserts the ACTUAL
  // secrets in use are absent - not a set of hard-coded example strings.
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbPassword = (() => {
    try {
      return new URL(dbUrl).password || null;
    } catch {
      return null;
    }
  })();

  const secrets = [
    ["APP_SECRET value", process.env.APP_SECRET],
    ["database password", dbPassword],
    ["database connection string", dbUrl || null],
    ["postgres:// scheme", "postgres://"],
    ["admin password", ADMIN_PASSWORD],
  ];
  for (const [label, needle] of secrets) {
    if (!needle) {
      check(`bundle: ${label} - not configured, nothing to leak`, true);
      continue;
    }
    check(`bundle: ${label} absent from client JS`, !all.includes(needle));
  }
  check("bundle: some client JS was actually inspected", all.length > 1000, `${all.length} bytes`);
  await ctx.close();
}

/** Addresses this script submits. Nothing else is ever deleted. */
const TEST_EMAILS = ["browser-verify@example.com", "nojs-verify@example.com"];

async function cleanUpTestInquiries() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("\nSkipped cleanup: DATABASE_URL is not set.");
    return;
  }
  try {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 1 });
    try {
      const deleted = await sql`
        delete from inquiries where email = any(${TEST_EMAILS}) returning reference
      `;
      console.log(
        `\nCleaned up ${deleted.length} test inquir${deleted.length === 1 ? "y" : "ies"}.`,
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    // A cleanup failure must never turn a green run red - it is hygiene, not a
    // check. Say so loudly enough that it gets noticed.
    console.log(`\nCleanup failed (rows left behind): ${error.message ?? error}`);
  }
}

check("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
check(
  "no failed requests",
  failedRequests.length === 0,
  failedRequests.slice(0, 3).join(" | "),
);
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();

/*
 * The two inquiries this script submits are real rows in a real table, and
 * leaving them behind means every run adds two more. That is noise in a local
 * database and contamination in any environment that matters - so the script
 * removes exactly what it created, keyed on the addresses it used, and says so
 * rather than doing it silently.
 */
await cleanUpTestInquiries();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("\nFAILED:");
  for (const f of failed) console.log(`  - ${f.name} ${f.detail ? `(${f.detail})` : ""}`);
  process.exit(1);
}
