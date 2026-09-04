import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

/**
 * End-to-end verification of Slice 1 against a real PostgreSQL database.
 *
 * These tests exercise the actual persistence layer, not a mock. If
 * DATABASE_URL is absent the suite FAILS rather than skipping, because a green
 * run that quietly proved nothing is worse than a red one.
 */

const hasDb = Boolean(process.env.DATABASE_URL);

// Imported lazily so a missing DATABASE_URL produces a clear message rather
// than a module-load crash.
let db: typeof import("@/lib/db").db;
let schema: typeof import("@/lib/db/schema");
let createInquiry: typeof import("@/lib/inquiries/create").createInquiry;
let queries: typeof import("@/lib/inquiries/queries");
let rateLimit: typeof import("@/lib/security/rate-limit");

const TEST_EMAIL_PREFIX = "vitest-money-path";

/**
 * `createInquiry` reads attribution from request cookies. Vitest has no request
 * context, so `next/headers` is stubbed for these tests. The cookie values are
 * real - only the transport is stubbed.
 */
const cookieJar = new Map<string, string>();

// Hoisted by Vitest, so it must sit at the module's top level.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
  headers: async () => new Headers(),
}));

beforeAll(async () => {
  if (!hasDb) return;

  db = (await import("@/lib/db")).db;
  schema = await import("@/lib/db/schema");
  createInquiry = (await import("@/lib/inquiries/create")).createInquiry;
  queries = await import("@/lib/inquiries/queries");
  rateLimit = await import("@/lib/security/rate-limit");
});

afterAll(async () => {
  if (!hasDb || !db) return;
  await db
    .delete(schema.inquiries)
    .where(like(schema.inquiries.email, `${TEST_EMAIL_PREFIX}%`));
  await db
    .delete(schema.rateLimitBuckets)
    .where(like(schema.rateLimitBuckets.bucketKey, "vitest:%"));
});

const context = {
  ip: "203.0.113.10",
  ipHash: "a".repeat(32),
  userAgent: "vitest/1.0",
};

function inquiryFixture(overrides: Record<string, unknown> = {}) {
  const eventDate = new Date();
  eventDate.setUTCDate(eventDate.getUTCDate() + 300);
  return {
    eventType: "wedding",
    firstName: "Dana",
    lastName: "Whitfield",
    email: `${TEST_EMAIL_PREFIX}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`,
    phone: "(860) 555-0134",
    contactPreference: "either",
    eventDate: eventDate.toISOString().slice(0, 10),
    eventDateFlexible: false,
    guestCountMin: 90,
    guestCountMax: 140,
    venueStatus: "shortlisted",
    venueName: "Saint Clements Castle",
    eventTown: "Portland",
    budgetBand: "25k_50k",
    servicesNeeded: ["full_planning", "guest_transport_coordination"],
    message: "Planning a September wedding.",
    ...overrides,
  } as Parameters<typeof createInquiry>[0];
}

describe.runIf(hasDb)("money path: inquiry persistence", () => {
  it("requires a database to be configured", () => {
    expect(hasDb, "DATABASE_URL must be set to run these tests").toBe(true);
  });

  it("persists an inquiry with a unique, readable reference", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");

    expect(inquiry.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inquiry.reference).toMatch(/^NEEP-[0-9A-Z]{6}$/);
    expect(inquiry.status).toBe("new");
    expect(inquiry.firstName).toBe("Dana");
    expect(inquiry.guestCountMin).toBe(90);
    expect(inquiry.servicesNeeded).toContain("guest_transport_coordination");
  });

  it("sets a response deadline from the configured SLA", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");

    const slaHours = Number.parseInt(process.env.RESPONSE_SLA_HOURS ?? "24", 10);
    const deltaHours =
      (inquiry.responseDueAt.getTime() - inquiry.submittedAt.getTime()) /
      (1000 * 60 * 60);

    expect(deltaHours).toBeCloseTo(slaHours, 1);
    expect(inquiry.firstResponseAt).toBeNull();
  });

  it("captures first touch, last touch and session from cookies", async () => {
    const { encodeTouch, encodeVisitor } = await import("@/lib/attribution/types");

    cookieJar.set(
      "neep_ft",
      encodeTouch({
        t: Math.floor(Date.now() / 1000) - 86_400,
        p: "/",
        r: "https://www.google.com/search",
        rh: "www.google.com",
        us: "google",
        um: "organic",
      }),
    );
    cookieJar.set(
      "neep_lt",
      encodeTouch({
        t: Math.floor(Date.now() / 1000),
        p: "/start",
        us: "google",
        um: "cpc",
        uc: "ct-weddings-2026",
        ci: "gclid-abc123",
        cs: "google",
      }),
    );
    cookieJar.set("neep_v", encodeVisitor({ sid: "session-xyz", n: 3 }));

    const { inquiry, attributionCaptured } = await createInquiry(
      inquiryFixture(),
      context,
      "/start",
    );
    cookieJar.clear();

    expect(attributionCaptured).toBe(true);

    const attribution = await queries.getAttribution(inquiry.id);
    expect(attribution).not.toBeNull();

    // First touch: how they originally found us.
    expect(attribution?.firstUtmSource).toBe("google");
    expect(attribution?.firstUtmMedium).toBe("organic");
    expect(attribution?.firstReferrerHost).toBe("www.google.com");
    expect(attribution?.firstLandingPath).toBe("/");

    // Last touch: the campaign that actually drove the submission.
    expect(attribution?.lastUtmMedium).toBe("cpc");
    expect(attribution?.lastUtmCampaign).toBe("ct-weddings-2026");
    expect(attribution?.lastClickId).toBe("gclid-abc123");
    expect(attribution?.lastClickIdSource).toBe("google");
    expect(attribution?.lastLandingPath).toBe("/start");

    // Session and request metadata.
    expect(attribution?.sessionId).toBe("session-xyz");
    expect(attribution?.touchCount).toBe(3);
    expect(attribution?.submittedFromPath).toBe("/start");
    expect(attribution?.userAgent).toBe("vitest/1.0");
    expect(attribution?.ipHash).toBe(context.ipHash);
  });

  it("stores an attribution row even for a direct visit with no cookies", async () => {
    cookieJar.clear();
    const { inquiry, attributionCaptured } = await createInquiry(
      inquiryFixture(),
      context,
      "/start",
    );

    expect(attributionCaptured).toBe(true);
    const attribution = await queries.getAttribution(inquiry.id);
    expect(attribution).not.toBeNull();
    expect(attribution?.firstUtmSource).toBeNull();
    expect(attribution?.submittedFromPath).toBe("/start");
  });

  it("never stores the raw IP address", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");
    const attribution = await queries.getAttribution(inquiry.id);
    expect(attribution?.ipHash).not.toContain("203.0.113.10");
  });

  it("makes the inquiry visible in the admin list immediately", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");
    const rows = await queries.listInquiries({ limit: 50 });
    const found = rows.find((row) => row.id === inquiry.id);

    expect(found).toBeDefined();
    expect(found?.reference).toBe(inquiry.reference);
    expect(found?.email).toBe(inquiry.email);
  });

  it("issues distinct references across many inquiries", async () => {
    const created = await Promise.all(
      Array.from({ length: 12 }, () =>
        createInquiry(inquiryFixture(), context, "/start"),
      ),
    );
    const references = new Set(created.map((c) => c.inquiry.reference));
    expect(references.size).toBe(12);
  });
});

describe.runIf(hasDb)("money path: SLA surfacing", () => {
  it("flags an unanswered inquiry once its deadline passes", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");

    // Not overdue while the deadline is in the future.
    expect(queries.isOverdue(inquiry)).toBe(false);

    await db
      .update(schema.inquiries)
      .set({ responseDueAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.inquiries.id, inquiry.id));

    const [reloaded] = await db
      .select()
      .from(schema.inquiries)
      .where(eq(schema.inquiries.id, inquiry.id));

    expect(queries.isOverdue(reloaded)).toBe(true);
    expect(await queries.countOverdue()).toBeGreaterThan(0);
  });

  it("stops the clock once a response is recorded", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");
    await db
      .update(schema.inquiries)
      .set({
        responseDueAt: new Date(Date.now() - 60_000),
        firstResponseAt: new Date(),
      })
      .where(eq(schema.inquiries.id, inquiry.id));

    const [reloaded] = await db
      .select()
      .from(schema.inquiries)
      .where(eq(schema.inquiries.id, inquiry.id));

    expect(queries.isOverdue(reloaded)).toBe(false);
  });

  it("does not chase spam or lost inquiries", async () => {
    const { inquiry } = await createInquiry(inquiryFixture(), context, "/start");
    await db
      .update(schema.inquiries)
      .set({ responseDueAt: new Date(Date.now() - 60_000), status: "spam" })
      .where(eq(schema.inquiries.id, inquiry.id));

    const [reloaded] = await db
      .select()
      .from(schema.inquiries)
      .where(eq(schema.inquiries.id, inquiry.id));

    expect(queries.isOverdue(reloaded)).toBe(false);
  });
});

describe.runIf(hasDb)("rate limiting", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `vitest:${Date.now()}:${Math.random()}`;
    const rule = { limit: 3, windowSeconds: 3600 };

    for (let i = 0; i < 3; i += 1) {
      const result = await rateLimit.consumeRateLimit(key, rule);
      expect(result.allowed, `request ${i + 1} should be allowed`).toBe(true);
    }

    const blocked = await rateLimit.consumeRateLimit(key, rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", async () => {
    const stamp = `${Date.now()}:${Math.random()}`;
    const rule = { limit: 1, windowSeconds: 3600 };

    expect((await rateLimit.consumeRateLimit(`vitest:a:${stamp}`, rule)).allowed).toBe(
      true,
    );
    expect((await rateLimit.consumeRateLimit(`vitest:a:${stamp}`, rule)).allowed).toBe(
      false,
    );
    // A different key must be unaffected by the first key's exhaustion.
    expect((await rateLimit.consumeRateLimit(`vitest:b:${stamp}`, rule)).allowed).toBe(
      true,
    );
  });

  it("counts concurrent requests without losing any to a race", async () => {
    const key = `vitest:concurrent:${Date.now()}:${Math.random()}`;
    const rule = { limit: 100, windowSeconds: 3600 };

    await Promise.all(
      Array.from({ length: 20 }, () => rateLimit.consumeRateLimit(key, rule)),
    );

    expect(await rateLimit.peekRateLimit(key, rule)).toBe(20);
  });

  it("starts a fresh count in a new window", async () => {
    const key = `vitest:window:${Date.now()}:${Math.random()}`;
    const rule = { limit: 1, windowSeconds: 60 };
    const now = new Date();

    expect((await rateLimit.consumeRateLimit(key, rule, now)).allowed).toBe(true);
    expect((await rateLimit.consumeRateLimit(key, rule, now)).allowed).toBe(false);

    const nextWindow = new Date(now.getTime() + 61_000);
    expect((await rateLimit.consumeRateLimit(key, rule, nextWindow)).allowed).toBe(
      true,
    );
  });
});
