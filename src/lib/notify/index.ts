import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { notificationRecipient, resendConfig, siteUrl } from "@/lib/env";
import type { Inquiry } from "@/lib/db/schema";
import { labelFor, serviceLabels, BUDGET_BANDS, EVENT_TYPES, VENUE_STATUSES } from "@/lib/domain/inquiry-options";

/**
 * Notification outbox.
 *
 * Every notification is written to the database BEFORE any delivery attempt, so
 * a provider outage can never make a lead invisible. The row is then updated
 * with the outcome.
 *
 * When no email provider is configured the row is stored with status
 * "no_provider" and the admin UI says so in plain language. It does not claim
 * an email was sent. An unconfigured integration must look unconfigured.
 */

export type NotifyOutcome = {
  notificationId: string | null;
  status: "sent" | "failed" | "no_provider" | "not_recorded";
  detail?: string;
};

function fmt(value: string | null | undefined, fallback = "Not provided"): string {
  return value && value.trim() !== "" ? value : fallback;
}

export function buildInquiryEmail(inquiry: Inquiry): {
  subject: string;
  text: string;
} {
  const eventTypeLabel = labelFor(EVENT_TYPES, inquiry.eventType) ?? inquiry.eventType;
  const name = `${inquiry.firstName} ${inquiry.lastName}`.trim();
  const services = serviceLabels(inquiry.servicesNeeded);

  const subject = `New ${eventTypeLabel.toLowerCase()} inquiry - ${name} (${inquiry.reference})`;

  const lines = [
    `New inquiry: ${inquiry.reference}`,
    "",
    `Respond by: ${inquiry.responseDueAt.toISOString()}`,
    "",
    "CONTACT",
    `  Name:      ${name}`,
    `  Email:     ${inquiry.email}`,
    `  Phone:     ${fmt(inquiry.phone)}`,
    `  Prefers:   ${inquiry.contactPreference}`,
    "",
    "EVENT",
    `  Type:      ${eventTypeLabel}`,
    `  Date:      ${fmt(inquiry.eventDate)}${inquiry.eventDateFlexible ? " (flexible)" : ""}`,
    `  Guests:    ${
      inquiry.guestCountMin || inquiry.guestCountMax
        ? `${inquiry.guestCountMin ?? "?"} - ${inquiry.guestCountMax ?? "?"}`
        : "Not provided"
    }`,
    `  Town:      ${fmt(inquiry.eventTown)}`,
    `  Venue:     ${fmt(inquiry.venueName)}`,
    `  Venue status: ${fmt(labelFor(VENUE_STATUSES, inquiry.venueStatus))}`,
    `  Budget:    ${fmt(labelFor(BUDGET_BANDS, inquiry.budgetBand))}`,
    "",
    "SERVICES REQUESTED",
    services.length > 0
      ? services.map((s) => `  - ${s}`).join("\n")
      : "  None selected",
    "",
    "MESSAGE",
    inquiry.message ? inquiry.message : "  (none)",
    "",
    `Open in admin: ${siteUrl()}/admin/inquiries/${inquiry.id}`,
  ];

  return { subject, text: lines.join("\n") };
}

async function deliverViaResend(
  config: { apiKey: string; from: string },
  to: string,
  subject: string,
  text: string,
): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: config.from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { id?: string };
  return { id: payload.id ?? "unknown" };
}

/**
 * Records and attempts a new-inquiry notification.
 *
 * Never throws. A notification failure must not roll back a persisted lead -
 * the lead is the asset, the email is a convenience. Failures are recorded on
 * the row and surfaced in admin.
 */
export async function notifyNewInquiry(inquiry: Inquiry): Promise<NotifyOutcome> {
  const recipient = notificationRecipient();
  const config = resendConfig();
  const { subject, text } = buildInquiryEmail(inquiry);

  if (!recipient) {
    console.warn(
      "[notify] INQUIRY_NOTIFICATION_EMAIL is not set. Inquiry %s stored but no notification recorded.",
      inquiry.reference,
    );
    return {
      notificationId: null,
      status: "not_recorded",
      detail: "INQUIRY_NOTIFICATION_EMAIL is not configured.",
    };
  }

  const driver = config ? "resend" : "log";

  let notificationId: string | null = null;
  try {
    const [row] = await db
      .insert(notifications)
      .values({
        inquiryId: inquiry.id,
        channel: "email",
        driver,
        recipient,
        subject,
        bodyText: text,
        status: "pending",
      })
      .returning({ id: notifications.id });
    notificationId = row?.id ?? null;
  } catch (error) {
    console.error("[notify] failed to record notification", {
      reference: inquiry.reference,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      notificationId: null,
      status: "not_recorded",
      detail: "Could not write the notification record.",
    };
  }

  if (!config) {
    // Honest no-op. The message is logged in full so nothing is lost, and the
    // stored status says plainly that no provider handled it.
    console.warn(
      "[notify] No email provider configured (RESEND_API_KEY / EMAIL_FROM). " +
        "Notification recorded but NOT delivered.\n--- %s ---\n%s",
      subject,
      text,
    );
    if (notificationId) {
      await db
        .update(notifications)
        .set({
          status: "no_provider",
          attempts: 1,
          lastError: "No transactional email provider is configured.",
        })
        .where(eq(notifications.id, notificationId))
        .catch(() => undefined);
    }
    return {
      notificationId,
      status: "no_provider",
      detail: "No transactional email provider is configured.",
    };
  }

  try {
    const result = await deliverViaResend(config, recipient, subject, text);
    if (notificationId) {
      await db
        .update(notifications)
        .set({
          status: "sent",
          attempts: 1,
          sentAt: new Date(),
          providerMessageId: result.id,
        })
        .where(eq(notifications.id, notificationId));
    }
    return { notificationId, status: "sent" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[notify] delivery failed", {
      reference: inquiry.reference,
      detail,
    });
    if (notificationId) {
      await db
        .update(notifications)
        .set({ status: "failed", attempts: 1, lastError: detail.slice(0, 1000) })
        .where(eq(notifications.id, notificationId))
        .catch(() => undefined);
    }
    return { notificationId, status: "failed", detail };
  }
}
