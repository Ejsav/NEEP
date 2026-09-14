"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiries, inquiryNotes, notifications } from "@/lib/db/schema";
import { requireAdminOrNull } from "@/lib/auth/guard";
import { logout, recordAudit } from "@/lib/auth/session";
import { getRequestContext } from "@/lib/security/request-context";
import { retryNotification } from "@/lib/notify";

/**
 * Admin mutations.
 *
 * Every action re-checks authorization itself. Being rendered inside the admin
 * layout proves nothing: an action is a public POST endpoint that anyone can
 * call directly.
 */

export async function logoutAction(): Promise<void> {
  const context = await getRequestContext();
  await logout(context);
  redirect("/admin/login");
}

const ALLOWED_STATUSES = [
  "new",
  "in_progress",
  "quoted",
  "won",
  "lost",
  "spam",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: unknown): value is AllowedStatus {
  return (
    typeof value === "string" &&
    (ALLOWED_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Records that a human has responded to an inquiry. This is what stops the SLA
 * clock, so it is deliberately an explicit action rather than a side effect of
 * opening the record - viewing a lead is not answering it.
 */
export async function markRespondedAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrNull();
  if (!admin) redirect("/admin/login");

  const id = formData.get("inquiryId");
  if (typeof id !== "string" || id === "") return;

  const context = await getRequestContext();
  const now = new Date();

  const [updated] = await db
    .update(inquiries)
    .set({ firstResponseAt: now, status: "in_progress", updatedAt: now })
    .where(eq(inquiries.id, id))
    .returning({ reference: inquiries.reference });

  if (updated) {
    await recordAudit({
      actorUserId: admin.user.id,
      actorLabel: admin.user.email,
      action: "inquiry.marked_responded",
      entityType: "inquiry",
      entityId: id,
      ipHash: context.ipHash,
      metadata: { reference: updated.reference },
    });
  }

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

export async function updateStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrNull();
  if (!admin) redirect("/admin/login");

  const id = formData.get("inquiryId");
  const status = formData.get("status");

  if (typeof id !== "string" || id === "") return;
  // Never trust a submitted enum value, even from our own select element.
  if (!isAllowedStatus(status)) return;

  const context = await getRequestContext();

  const [updated] = await db
    .update(inquiries)
    .set({ status, updatedAt: new Date() })
    .where(eq(inquiries.id, id))
    .returning({ reference: inquiries.reference });

  if (updated) {
    await recordAudit({
      actorUserId: admin.user.id,
      actorLabel: admin.user.email,
      action: "inquiry.status_changed",
      entityType: "inquiry",
      entityId: id,
      ipHash: context.ipHash,
      metadata: { reference: updated.reference, status },
    });
  }

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

/** Hard cap. Long enough for a real account of a call, short enough to bound the row. */
const MAX_NOTE_LENGTH = 4000;

/**
 * Appends a note to an inquiry.
 *
 * Append-only by design: there is no edit action and no delete action, because
 * this is the record of what was said about a live commercial relationship and
 * a record that can be quietly rewritten is not a record. The author's name is
 * captured at write time rather than joined at read time, so removing a staff
 * account later leaves the history intact.
 *
 * Like every action here it re-checks authorization itself. Being reachable
 * only from a page behind the admin layout proves nothing - this is a public
 * POST endpoint.
 */
export async function addNoteAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrNull();
  if (!admin) redirect("/admin/login");

  const id = formData.get("inquiryId");
  const body = formData.get("body");

  if (typeof id !== "string" || id === "") return;
  if (typeof body !== "string") return;

  const text = body.trim().slice(0, MAX_NOTE_LENGTH);
  if (text === "") return;

  // The inquiry must exist. Without this, a forged id writes an orphan row that
  // no page will ever show and nobody will ever find.
  const [target] = await db
    .select({ reference: inquiries.reference })
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1);
  if (!target) return;

  const context = await getRequestContext();

  await db.insert(inquiryNotes).values({
    inquiryId: id,
    authorUserId: admin.user.id,
    authorLabel: admin.user.name || admin.user.email,
    body: text,
  });

  await recordAudit({
    actorUserId: admin.user.id,
    actorLabel: admin.user.email,
    action: "inquiry.note_added",
    entityType: "inquiry",
    entityId: id,
    ipHash: context.ipHash,
    metadata: { reference: target.reference, length: text.length },
  });

  revalidatePath(`/admin/inquiries/${id}`);
}

/**
 * Re-attempts a notification that did not go out.
 *
 * The inquiry id is taken from the notification row rather than the form, so a
 * forged pair cannot make one inquiry's page revalidate on another's retry -
 * and more importantly, cannot be used to probe which ids exist.
 */
export async function retryNotificationAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrNull();
  if (!admin) redirect("/admin/login");

  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string" || notificationId === "") return;

  const [row] = await db
    .select({ inquiryId: notifications.inquiryId })
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);
  if (!row) return;

  const context = await getRequestContext();
  const outcome = await retryNotification(notificationId);

  await recordAudit({
    actorUserId: admin.user.id,
    actorLabel: admin.user.email,
    action: "notification.retried",
    entityType: "notification",
    entityId: notificationId,
    ipHash: context.ipHash,
    metadata: { result: outcome.status, detail: outcome.detail ?? null },
  });

  revalidatePath(`/admin/inquiries/${row.inquiryId}`);
}
