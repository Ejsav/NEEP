import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, lt, notInArray, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inquiries,
  inquiryAttribution,
  inquiryNotes,
  notifications,
} from "@/lib/db/schema";

/**
 * Read models for the admin area.
 *
 * These select explicit column lists rather than whole rows. Nothing that a
 * page does not render should travel to the server component in the first
 * place, and being explicit here is what stops a future column - a vendor cost,
 * a margin - from leaking into a payload by default.
 */

export type InquiryListRow = {
  id: string;
  reference: string;
  status: (typeof inquiries.status.enumValues)[number];
  eventType: (typeof inquiries.eventType.enumValues)[number];
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  eventDate: string | null;
  eventDateFlexible: boolean;
  guestCountMin: number | null;
  guestCountMax: number | null;
  eventTown: string | null;
  budgetBand: string | null;
  submittedAt: Date;
  responseDueAt: Date;
  firstResponseAt: Date | null;
  /** Marketing source, resolved for the list without a second query. */
  lastUtmSource: string | null;
  lastUtmMedium: string | null;
  lastUtmCampaign: string | null;
  lastReferrerHost: string | null;
};

const PAGE_SIZE = 50;

export type InquiryFilter = {
  /** Exact status match. Validated by the caller against the enum. */
  status?: (typeof inquiries.status.enumValues)[number];
  eventType?: (typeof inquiries.eventType.enumValues)[number];
  /** Only open inquiries past their response deadline. */
  overdue?: boolean;
  /** Free text, matched against reference, name and email. */
  search?: string;
};

/**
 * Turns a filter into a WHERE clause, or undefined when nothing is filtered.
 *
 * Shared by the list and the count so a paginated view can never disagree with
 * its own total - the bug where page 2 of a filtered list shows unfiltered rows
 * comes from writing that predicate twice.
 *
 * Search is matched with ILIKE against three columns. At this data volume that
 * is the right call: a tsvector index is a schema change and a maintenance
 * burden to answer a question about at most a few thousand rows, and it would
 * not match a partial reference like "D04" anyway.
 */
function whereFor(filter: InquiryFilter, now: Date): SQL | undefined {
  const clauses: SQL[] = [];

  if (filter.status) clauses.push(eq(inquiries.status, filter.status));
  if (filter.eventType) clauses.push(eq(inquiries.eventType, filter.eventType));

  if (filter.overdue) {
    clauses.push(isNull(inquiries.firstResponseAt));
    clauses.push(lt(inquiries.responseDueAt, now));
    clauses.push(notInArray(inquiries.status, ["spam", "lost"]));
  }

  const search = filter.search?.trim();
  if (search) {
    // Escape the wildcards so a customer searching for "100%" gets what they
    // typed rather than every row in the table.
    const term = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const match = or(
      ilike(inquiries.reference, term),
      ilike(inquiries.firstName, term),
      ilike(inquiries.lastName, term),
      ilike(inquiries.email, term),
      ilike(inquiries.eventTown, term),
    );
    if (match) clauses.push(match);
  }

  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : and(...clauses);
}

export async function listInquiries(
  options: { limit?: number; offset?: number; filter?: InquiryFilter; now?: Date } = {},
): Promise<InquiryListRow[]> {
  const limit = Math.min(options.limit ?? PAGE_SIZE, 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const where = whereFor(options.filter ?? {}, options.now ?? new Date());

  return db
    .select({
      id: inquiries.id,
      reference: inquiries.reference,
      status: inquiries.status,
      eventType: inquiries.eventType,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      email: inquiries.email,
      phone: inquiries.phone,
      eventDate: inquiries.eventDate,
      eventDateFlexible: inquiries.eventDateFlexible,
      guestCountMin: inquiries.guestCountMin,
      guestCountMax: inquiries.guestCountMax,
      eventTown: inquiries.eventTown,
      budgetBand: inquiries.budgetBand,
      submittedAt: inquiries.submittedAt,
      responseDueAt: inquiries.responseDueAt,
      firstResponseAt: inquiries.firstResponseAt,
      lastUtmSource: inquiryAttribution.lastUtmSource,
      lastUtmMedium: inquiryAttribution.lastUtmMedium,
      lastUtmCampaign: inquiryAttribution.lastUtmCampaign,
      lastReferrerHost: inquiryAttribution.lastReferrerHost,
    })
    .from(inquiries)
    .leftJoin(inquiryAttribution, eq(inquiryAttribution.inquiryId, inquiries.id))
    .where(where)
    .orderBy(desc(inquiries.submittedAt))
    .limit(limit)
    .offset(offset);
}

export async function countInquiries(
  filter: InquiryFilter = {},
  now: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(whereFor(filter, now));
  return row?.value ?? 0;
}

/**
 * How many inquiries arrived in the last `days` days, and how many of those
 * were answered inside the commitment. This is the only number that says
 * whether the promise on the public site is actually being kept.
 */
export async function slaSummary(
  days = 30,
  now: Date = new Date(),
): Promise<{ received: number; answered: number; missed: number }> {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const scope = and(
    gte(inquiries.submittedAt, since),
    notInArray(inquiries.status, ["spam"]),
  );

  const [received] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(scope);

  const [answeredInTime] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(
      and(
        scope,
        // `firstResponseAt <= responseDueAt` is the definition of kept. An
        // unanswered inquiry is neither answered nor yet missed until its
        // deadline passes, which is what the third number below measures.
        lt(inquiries.firstResponseAt, inquiries.responseDueAt),
      ),
    );

  const [missed] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(
      and(
        scope,
        notInArray(inquiries.status, ["lost"]),
        or(
          gte(inquiries.firstResponseAt, inquiries.responseDueAt),
          and(isNull(inquiries.firstResponseAt), lt(inquiries.responseDueAt, now)),
        ),
      ),
    );

  return {
    received: received?.value ?? 0,
    answered: answeredInTime?.value ?? 0,
    missed: missed?.value ?? 0,
  };
}

/**
 * Open inquiries past their response deadline. Drives the SLA banner.
 *
 * Built from typed operators rather than a raw `sql` template: interpolating a
 * JS Date into raw SQL makes postgres.js bind it as a string against a
 * timestamptz parameter, which throws at runtime.
 */
export async function countOverdue(now: Date = new Date()): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(inquiries)
    .where(
      and(
        isNull(inquiries.firstResponseAt),
        lt(inquiries.responseDueAt, now),
        notInArray(inquiries.status, ["spam", "lost"]),
      ),
    );
  return row?.value ?? 0;
}

export async function getInquiry(id: string) {
  const [row] = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1);
  return row ?? null;
}

export async function getAttribution(inquiryId: string) {
  const [row] = await db
    .select()
    .from(inquiryAttribution)
    .where(eq(inquiryAttribution.inquiryId, inquiryId))
    .limit(1);
  return row ?? null;
}

export async function getNotifications(inquiryId: string) {
  return db
    .select({
      id: notifications.id,
      driver: notifications.driver,
      recipient: notifications.recipient,
      status: notifications.status,
      attempts: notifications.attempts,
      lastError: notifications.lastError,
      createdAt: notifications.createdAt,
      sentAt: notifications.sentAt,
    })
    .from(notifications)
    .where(eq(notifications.inquiryId, inquiryId))
    .orderBy(desc(notifications.createdAt));
}

/** True when an open inquiry has passed its response deadline. */
export function isOverdue(
  row: Pick<InquiryListRow, "responseDueAt" | "firstResponseAt" | "status">,
  now: Date = new Date(),
): boolean {
  if (row.firstResponseAt) return false;
  if (row.status === "spam" || row.status === "lost") return false;
  return row.responseDueAt < now;
}

/** Notes on an inquiry, oldest first: this reads as a history, not a feed. */
export async function getNotes(inquiryId: string) {
  return db
    .select({
      id: inquiryNotes.id,
      authorLabel: inquiryNotes.authorLabel,
      body: inquiryNotes.body,
      createdAt: inquiryNotes.createdAt,
    })
    .from(inquiryNotes)
    .where(eq(inquiryNotes.inquiryId, inquiryId))
    .orderBy(inquiryNotes.createdAt);
}
