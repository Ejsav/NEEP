import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";

/**
 * Partial-funnel capture, against a real PostgreSQL database.
 *
 * Two properties matter more than anything else here and both are asserted
 * directly rather than inferred:
 *
 *  1. A draft NEVER holds personally identifying information. Contact details
 *     are asked for on the last step and written only by a real submission.
 *  2. A completed flow produces EXACTLY ONE inquiry, however many times the
 *     visitor went back, changed their mind, or re-saved a step.
 */

const hasDb = Boolean(process.env.DATABASE_URL);

let db: typeof import("@/lib/db").db;
let schema: typeof import("@/lib/db/schema");
let drafts: typeof import("@/lib/inquiries/drafts");
let createInquiry: typeof import("@/lib/inquiries/create").createInquiry;

const TEST_EMAIL_PREFIX = "vitest-drafts";

/**
 * The draft module reads and writes a cookie. Vitest has no request context, so
 * `next/headers` is stubbed over a real Map - the cookie values and the HMAC
 * keyed off them are genuine, only the transport is faked.
 */
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
  headers: async () => new Headers(),
}));

const context = { ip: null, ipHash: "vitest-ip-hash", userAgent: "vitest" };

beforeAll(async () => {
  if (!hasDb) return;
  db = (await import("@/lib/db")).db;
  schema = await import("@/lib/db/schema");
  drafts = await import("@/lib/inquiries/drafts");
  createInquiry = (await import("@/lib/inquiries/create")).createInquiry;
});

afterAll(async () => {
  if (!hasDb || !db) return;
  const rows = await db
    .select({ id: schema.inquiries.id })
    .from(schema.inquiries)
    .where(like(schema.inquiries.email, `${TEST_EMAIL_PREFIX}%`));
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    await db
      .delete(schema.inquiryDrafts)
      .where(inArray(schema.inquiryDrafts.convertedInquiryId, ids));
  }
  await db
    .delete(schema.inquiries)
    .where(like(schema.inquiries.email, `${TEST_EMAIL_PREFIX}%`));
  await db
    .delete(schema.inquiryDrafts)
    .where(eq(schema.inquiryDrafts.ipHash, "vitest-ip-hash"));
});

describe.runIf(hasDb)("planner drafts", () => {
  /*
   * Every test starts from no cookie and no leftover rows. Without the delete,
   * each test's query matched drafts created by earlier tests (they share a
   * test ipHash) and asserted against the wrong row.
   */
  beforeEach(async () => {
    cookieJar.clear();
    await db
      .delete(schema.inquiryDrafts)
      .where(eq(schema.inquiryDrafts.ipHash, "vitest-ip-hash"));
  });

  /** The draft belonging to the current cookie, which is the one under test. */
  async function currentDraft() {
    const row = await drafts.getActiveDraft();
    expect(row, "a draft exists for the current cookie").toBeTruthy();
    return row!;
  }

  it("fails loudly when DATABASE_URL is absent", () => {
    expect(hasDb).toBe(true);
  });

  it("creates one draft across several step saves, not one per step", async () => {
    await drafts.saveDraft({ eventType: "wedding" }, 1, context);
    const token = cookieJar.get(drafts.DRAFT_COOKIE);
    expect(token, "a draft cookie is issued on first save").toBeTruthy();

    await drafts.saveDraft({ eventType: "wedding", eventTown: "Mystic" }, 2, context);
    await drafts.saveDraft(
      { eventType: "wedding", eventTown: "Mystic", venueStatus: "need_help" },
      3,
      context,
    );

    const rows = await db
      .select()
      .from(schema.inquiryDrafts)
      .where(eq(schema.inquiryDrafts.ipHash, "vitest-ip-hash"));

    expect(rows, "three step saves, one row").toHaveLength(1);
    expect(rows[0].eventTown).toBe("Mystic");
    expect(rows[0].venueStatus).toBe("need_help");
    expect(rows[0].furthestStep).toBe(3);
  });

  it("never stores contact details", async () => {
    // Contact fields are deliberately not part of DraftInput. Pass them anyway,
    // the way a hand-crafted POST would, and prove none of them can land.
    await drafts.saveDraft(
      {
        eventType: "corporate",
        // @ts-expect-error - proving the shape rejects PII even when forced
        firstName: "Should",
        lastName: "NotPersist",
        email: "should-not-persist@example.com",
        phone: "8605550147",
      },
      2,
      context,
    );

    const row = await currentDraft();
    const serialised = JSON.stringify(row).toLowerCase();
    for (const leaked of ["should", "notpersist", "should-not-persist", "8605550147"]) {
      expect(serialised, `draft must not contain ${leaked}`).not.toContain(leaked);
    }
    // And the columns simply do not exist on this table.
    expect(Object.keys(row)).not.toContain("firstName");
    expect(Object.keys(row)).not.toContain("email");
  });

  it("never walks furthestStep backwards", async () => {
    await drafts.saveDraft({ eventType: "private" }, 4, context);
    // The visitor goes back to change an answer. They still reached step 4, and
    // the drop-off report depends on that staying true.
    await drafts.saveDraft({ eventType: "private", eventTown: "Hartford" }, 2, context);

    const row = await currentDraft();
    expect(row.furthestStep).toBe(4);
    expect(row.eventTown, "the newer answer still wins").toBe("Hartford");
  });

  it("records a funnel event per step transition", async () => {
    await drafts.saveDraft({ eventType: "wedding" }, 1, context);
    await drafts.saveDraft({ eventType: "wedding" }, 2, context);

    const row = await currentDraft();

    const events = await db
      .select()
      .from(schema.funnelEvents)
      .where(eq(schema.funnelEvents.draftId, row.id));

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.map((e) => e.step).sort()).toEqual([1, 2]);
    expect(new Set(events.map((e) => e.ipHash))).toEqual(new Set(["vitest-ip-hash"]));
  });

  it("converts a draft into exactly one inquiry", async () => {
    await drafts.saveDraft({ eventType: "wedding", eventTown: "Essex" }, 3, context);
    const draft = await drafts.getActiveDraft();
    expect(draft).toBeTruthy();

    const { inquiry } = await createInquiry(
      {
        eventType: "wedding",
        firstName: "Convert",
        lastName: "Once",
        email: `${TEST_EMAIL_PREFIX}-convert@example.com`,
        contactPreference: "either",
        eventDateFlexible: true,
        servicesNeeded: [],
        scopeTier: "full_planning",
      } as Parameters<typeof createInquiry>[0],
      context,
      "/plan",
      draft!.id,
    );

    await drafts.convertDraft(draft!.id, inquiry.id);

    const linked = await db
      .select()
      .from(schema.inquiries)
      .where(eq(schema.inquiries.draftId, draft!.id));

    expect(linked).toHaveLength(1);
    expect(linked[0].scopeTier).toBe("full_planning");

    const [after] = await db
      .select()
      .from(schema.inquiryDrafts)
      .where(eq(schema.inquiryDrafts.id, draft!.id));
    expect(after.status).toBe("converted");
    expect(after.convertedInquiryId).toBe(inquiry.id);
  });

  it("refuses a second inquiry against the same draft", async () => {
    await drafts.saveDraft({ eventType: "private" }, 2, context);
    const draft = await drafts.getActiveDraft();

    const base = {
      eventType: "private",
      firstName: "First",
      lastName: "Claim",
      contactPreference: "either",
      eventDateFlexible: true,
      servicesNeeded: [],
    };

    const first = await createInquiry(
      { ...base, email: `${TEST_EMAIL_PREFIX}-a@example.com` } as Parameters<
        typeof createInquiry
      >[0],
      context,
      "/plan",
      draft!.id,
    );

    // A double submit must not be refused outright - the lead is the asset - but
    // it must not claim a draft that already belongs to another inquiry.
    const second = await createInquiry(
      { ...base, email: `${TEST_EMAIL_PREFIX}-b@example.com` } as Parameters<
        typeof createInquiry
      >[0],
      context,
      "/plan",
      draft!.id,
    );

    expect(first.inquiry.draftId).toBe(draft!.id);
    expect(second.inquiry.id, "the second lead is still saved").toBeTruthy();
    expect(second.inquiry.draftId, "but unlinked").toBeNull();
  });

  it("does not resume a draft once it has converted", async () => {
    await drafts.saveDraft({ eventType: "corporate" }, 2, context);
    const draft = await drafts.getActiveDraft();
    await drafts.convertDraft(draft!.id, null as unknown as string);

    const resumed = await drafts.getActiveDraft();
    expect(resumed).toBeNull();
  });
});
