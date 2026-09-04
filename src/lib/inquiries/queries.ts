import "server-only";
import { and, count, desc, eq, isNull, lt, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiries, inquiryAttribution, notifications } from "@/lib/db/schema";

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

export async function listInquiries(
  options: { limit?: number; offset?: number } = {},
): Promise<InquiryListRow[]> {
  const limit = Math.min(options.limit ?? PAGE_SIZE, 200);
  const offset = Math.max(options.offset ?? 0, 0);

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
    .orderBy(desc(inquiries.submittedAt))
    .limit(limit)
    .offset(offset);
}

export async function countInquiries(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(inquiries);
  return row?.value ?? 0;
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
