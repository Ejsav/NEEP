"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import { requireAdminOrNull } from "@/lib/auth/guard";
import { logout, recordAudit } from "@/lib/auth/session";
import { getRequestContext } from "@/lib/security/request-context";

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
