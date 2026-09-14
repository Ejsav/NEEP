import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { like, sql } from "drizzle-orm";

/**
 * The operator surface, against a real PostgreSQL database.
 *
 * Three things are asserted here because each one is a way the admin could lie
 * to the person running the business:
 *
 *  1. A filtered list and its own total must agree. The classic failure is a
 *     header that counts every row while the table below it shows a subset.
 *  2. The funnel's step figures must be internally consistent - "reached" is
 *     cumulative, so a visitor who finished has to count toward every step.
 *  3. A note must survive its author. The record of what was promised to a
 *     customer cannot depend on a staff account still existing.
 */

const hasDb = Boolean(process.env.DATABASE_URL);

let db: typeof import("@/lib/db").db;
let schema: typeof import("@/lib/db/schema");
let queries: typeof import("@/lib/inquiries/queries");
let funnel: typeof import("@/lib/inquiries/funnel");

const EMAIL_PREFIX = "vitest-operator";
const TOKEN_PREFIX = "vitest-operator-draft";

beforeAll(async () => {
  if (!hasDb) return;
  db = (await import("@/lib/db")).db;
  schema = await import("@/lib/db/schema");
  queries = await import("@/lib/inquiries/queries");
  funnel = await import("@/lib/inquiries/funnel");
});

async function cleanUp() {
  if (!hasDb || !db) return;
  await db
    .delete(schema.inquiries)
    .where(like(schema.inquiries.email, `${EMAIL_PREFIX}%`));
  await db
    .delete(schema.inquiryDrafts)
    .where(like(schema.inquiryDrafts.tokenHash, `${TOKEN_PREFIX}%`));
  await db
    .delete(schema.adminUsers)
    .where(like(schema.adminUsers.email, `${EMAIL_PREFIX}%`));
}

afterEach(cleanUp);
afterAll(cleanUp);

let counter = 0;
function unique(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Writes an inquiry directly: these tests are about reading, not submitting. */
async function seedInquiry(overrides: Record<string, unknown> = {}) {
  const stamp = unique();
  const submittedAt = new Date();
  const [row] = await db
    .insert(schema.inquiries)
    .values({
      reference: `NEEP-T${stamp.slice(-5).toUpperCase()}`,
      eventType: "wedding",
      firstName: "Test",
      lastName: "Person",
      email: `${EMAIL_PREFIX}-${stamp}@example.com`,
      contactPreference: "email",
      submittedAt,
      responseDueAt: new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000),
      ...overrides,
    } as typeof schema.inquiries.$inferInsert)
    .returning();
  return row;
}

async function seedDraft(furthestStep: number, status: "active" | "converted", ageMinutes: number) {
  const at = new Date(Date.now() - ageMinutes * 60_000);
  await db.insert(schema.inquiryDrafts).values({
    tokenHash: `${TOKEN_PREFIX}-${unique()}`,
    status,
    eventType: "wedding",
    furthestStep,
    createdAt: at,
    updatedAt: at,
  });
}

describe.runIf(hasDb)("inquiry queue: filtering", () => {
  it("counts exactly what it lists", async () => {
    await seedInquiry({ status: "won" });
    await seedInquiry({ status: "won" });
    await seedInquiry({ status: "lost" });

    const filter = { status: "won" as const, search: EMAIL_PREFIX };
    const [rows, total] = await Promise.all([
      queries.listInquiries({ filter, limit: 100 }),
      queries.countInquiries(filter),
    ]);

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
    expect(rows.every((r) => r.status === "won")).toBe(true);
  });

  it("searches reference, name and email alike", async () => {
    const created = await seedInquiry({ firstName: "Wilhelmina" });

    const byReference = await queries.listInquiries({
      filter: { search: created.reference },
      limit: 10,
    });
    const byName = await queries.listInquiries({
      filter: { search: "wilhelmin" },
      limit: 10,
    });

    expect(byReference.map((r) => r.id)).toContain(created.id);
    expect(byName.map((r) => r.id)).toContain(created.id);
  });

  it("treats a wildcard in the search term as a literal", async () => {
    await seedInquiry();
    // Unescaped, "%" matches every row in the table. Escaped, it matches none.
    const rows = await queries.listInquiries({ filter: { search: "%" }, limit: 10 });
    expect(rows).toHaveLength(0);
  });

  it("returns only open, past-deadline inquiries when asked for overdue", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60_000);

    const late = await seedInquiry({ responseDueAt: past });
    const answered = await seedInquiry({ responseDueAt: past, firstResponseAt: past });
    const junk = await seedInquiry({ responseDueAt: past, status: "spam" });

    const rows = await queries.listInquiries({
      filter: { overdue: true, search: EMAIL_PREFIX },
      limit: 100,
      now,
    });
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(late.id);
    expect(ids).not.toContain(answered.id);
    expect(ids).not.toContain(junk.id);
  });
});

describe.runIf(hasDb)("SLA summary", () => {
  it("separates answered in time from missed", async () => {
    const now = new Date();
    const due = new Date(now.getTime() - 60 * 60 * 1000);

    await seedInquiry({ responseDueAt: due, firstResponseAt: new Date(due.getTime() - 60_000) });
    await seedInquiry({ responseDueAt: due, firstResponseAt: new Date(due.getTime() + 60_000) });
    await seedInquiry({ responseDueAt: due });

    const summary = await queries.slaSummary(30, now);

    // Other rows may exist in the database; assert the deltas this test owns.
    expect(summary.received).toBeGreaterThanOrEqual(3);
    expect(summary.answered).toBeGreaterThanOrEqual(1);
    expect(summary.missed).toBeGreaterThanOrEqual(2);
  });

  it("reports a median response time rather than a mean", async () => {
    const now = new Date();
    const submittedAt = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const responseDueAt = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);
    const after = (hours: number) =>
      new Date(submittedAt.getTime() + hours * 60 * 60 * 1000);

    // 1h, 2h and 100h. The mean is 34 hours; the median is 2. A single very
    // late reply must not make a healthy queue look broken.
    await seedInquiry({ submittedAt, responseDueAt, firstResponseAt: after(1) });
    await seedInquiry({ submittedAt, responseDueAt, firstResponseAt: after(2) });
    await seedInquiry({ submittedAt, responseDueAt, firstResponseAt: after(100) });

    const summary = await queries.slaSummary(30, now);
    expect(summary.medianResponseSeconds).not.toBeNull();
    expect(summary.medianResponseSeconds! / 3600).toBeCloseTo(2, 1);
  });

  it("has no median to report when nothing has been answered", async () => {
    await seedInquiry();
    const summary = await queries.slaSummary(30, new Date());
    expect(summary.medianResponseSeconds).toBeNull();
  });
});

describe.runIf(hasDb)("queue at volume", () => {
  it("pages to the end of a thousand rows, on an indexed ordering column", async () => {
    const base = Date.now();
    const rows = Array.from({ length: 1000 }, (_, i) => {
      const submittedAt = new Date(base - i * 60_000);
      return {
        reference: `NEEP-V${i.toString().padStart(5, "0")}`,
        eventType: "wedding" as const,
        firstName: "Volume",
        lastName: "Row",
        email: `${EMAIL_PREFIX}-volume-${i}@example.com`,
        contactPreference: "email" as const,
        submittedAt,
        responseDueAt: new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000),
      };
    });
    await db.insert(schema.inquiries).values(rows);

    const page = await queries.listInquiries({ limit: 50, offset: 950 });
    expect(page).toHaveLength(50);
    // Newest first, and the page boundary lands where it should.
    expect(page[0].firstName).toBe("Volume");
    expect(
      page.every((row, i) => i === 0 || row.submittedAt <= page[i - 1].submittedAt),
    ).toBe(true);

    /*
     * Assert the INDEX EXISTS, not the plan that was chosen.
     *
     * The first version of this test read EXPLAIN and required an index scan.
     * It failed, and the database was right: at a thousand rows the whole table
     * is 32 pages, so a sequential scan plus a sort genuinely is cheaper and
     * Postgres correctly picks it. Asserting a plan asserts the size of the
     * fixture rather than the health of the schema.
     *
     * What protects the admin at ten thousand rows is that the ordering column
     * is indexed at all - then the planner flips to it on its own, when it
     * pays. That is the durable fact, so that is what is checked.
     */
    const indexes = await db.execute(
      sql`select indexdef from pg_indexes where tablename = 'inquiries'`,
    );
    const definitions = JSON.stringify(indexes).toLowerCase();
    expect(definitions).toContain("(submitted_at)");
    expect(definitions).toContain("(status)");
    expect(definitions).toContain("(response_due_at)");
  });
});

describe.runIf(hasDb)("funnel", () => {
  beforeAll(async () => {
    if (!hasDb) return;
    /*
     * The funnel is a whole-table aggregate, so the arithmetic below is only
     * exact against an empty table. That is safe ONLY because
     * `fileParallelism: false` in vitest.config.ts keeps suites from racing
     * over one Postgres schema - if that ever changes, this truncation will
     * start deleting another suite's drafts mid-run.
     */
    await db.delete(schema.funnelEvents);
    await db.delete(schema.inquiryDrafts);
  });

  it("keeps reached, carried on and stopped here internally consistent", async () => {
    await seedDraft(1, "active", 120);
    await seedDraft(1, "active", 120);
    await seedDraft(3, "active", 120);
    await seedDraft(5, "converted", 120);
    await seedDraft(2, "active", 1); // still filling it in

    const summary = await funnel.funnelSummary();

    expect(summary.started).toBe(5);
    expect(summary.converted).toBe(1);
    expect(summary.abandoned).toBe(3);
    expect(summary.live).toBe(1);

    const step = (n: number) => summary.steps.find((s) => s.step === n)!;

    // Everyone reached step 1; the two who stopped there did not carry on.
    expect(step(1).reached).toBe(5);
    expect(step(1).abandonedHere).toBe(2);
    expect(step(1).continued).toBe(3);

    // Each step's "reached" equals the previous step's "carried on".
    for (let n = 2; n <= 5; n += 1) {
      expect(step(n).reached).toBe(step(n - 1).continued);
    }

    // A completed visitor counts toward the final step, not past it.
    expect(step(5).reached).toBe(1);
    expect(step(5).continued).toBe(1);
    expect(summary.conversionRate).toBeCloseTo(1 / 5, 5);
  });

  it("reports nothing rather than dividing by zero on an empty funnel", async () => {
    await db.delete(schema.inquiryDrafts);
    const summary = await funnel.funnelSummary();

    expect(summary.started).toBe(0);
    expect(summary.conversionRate).toBeNull();
    expect(summary.steps.every((s) => s.continuationRate === null)).toBe(true);
  });
});

describe.runIf(hasDb)("inquiry notes", () => {
  it("survives the deletion of the account that wrote it", async () => {
    const inquiry = await seedInquiry();
    const [author] = await db
      .insert(schema.adminUsers)
      .values({
        email: `${EMAIL_PREFIX}-author-${unique()}@example.com`,
        passwordHash: "not-a-real-hash",
        name: "Departing Staffer",
      })
      .returning();

    await db.insert(schema.inquiryNotes).values({
      inquiryId: inquiry.id,
      authorUserId: author.id,
      authorLabel: author.name,
      body: "Told them the barn has no generator.",
    });

    await db.delete(schema.adminUsers).where(sql`${schema.adminUsers.id} = ${author.id}`);

    const notes = await queries.getNotes(inquiry.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].authorLabel).toBe("Departing Staffer");
    expect(notes[0].body).toContain("no generator");
  });

  it("returns notes oldest first, so it reads as a history", async () => {
    const inquiry = await seedInquiry();
    const base = Date.now();

    await db.insert(schema.inquiryNotes).values([
      {
        inquiryId: inquiry.id,
        authorLabel: "A",
        body: "first",
        createdAt: new Date(base - 60_000),
      },
      {
        inquiryId: inquiry.id,
        authorLabel: "B",
        body: "second",
        createdAt: new Date(base),
      },
    ]);

    const notes = await queries.getNotes(inquiry.id);
    expect(notes.map((n) => n.body)).toEqual(["first", "second"]);
  });

  it("is removed with the inquiry it belongs to", async () => {
    const inquiry = await seedInquiry();
    await db.insert(schema.inquiryNotes).values({
      inquiryId: inquiry.id,
      authorLabel: "A",
      body: "attached",
    });

    await db.delete(schema.inquiries).where(sql`${schema.inquiries.id} = ${inquiry.id}`);

    expect(await queries.getNotes(inquiry.id)).toHaveLength(0);
  });
});
