import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { inquiries, inquiryAttribution } from "@/lib/db/schema";
import type { Inquiry } from "@/lib/db/schema";
import { responseSlaHours } from "@/lib/env";
import {
  COOKIE_FIRST_TOUCH,
  COOKIE_LAST_TOUCH,
  COOKIE_VISITOR,
  decodeTouch,
  decodeVisitor,
  type Touch,
} from "@/lib/attribution/types";
import { generateReference } from "@/lib/inquiries/reference";
import type { InquiryInput } from "@/lib/validation/inquiry";
import type { RequestContext } from "@/lib/security/request-context";

/**
 * Persists an inquiry together with its attribution.
 *
 * DELIBERATELY NOT ONE TRANSACTION. The lead is the asset; attribution is
 * reporting metadata. The inquiry is committed first and on its own, so a
 * failure writing marketing data can never roll back a real customer's
 * submission. Attribution is inserted after and its failure is recorded, not
 * raised. The foreign key direction means the reverse orphan - attribution
 * pointing at an inquiry that never committed - is impossible.
 */

export type PersistedInquiry = {
  inquiry: Inquiry;
  attributionCaptured: boolean;
};

function touchToFirstColumns(touch: Touch | undefined) {
  if (!touch) return {};
  return {
    firstTouchAt: touch.t ? new Date(touch.t * 1000) : null,
    firstLandingPath: touch.p ?? null,
    firstReferrer: touch.r ?? null,
    firstReferrerHost: touch.rh ?? null,
    firstUtmSource: touch.us ?? null,
    firstUtmMedium: touch.um ?? null,
    firstUtmCampaign: touch.uc ?? null,
    firstUtmTerm: touch.ut ?? null,
    firstUtmContent: touch.un ?? null,
    firstClickId: touch.ci ?? null,
    firstClickIdSource: touch.cs ?? null,
  };
}

function touchToLastColumns(touch: Touch | undefined) {
  if (!touch) return {};
  return {
    lastTouchAt: touch.t ? new Date(touch.t * 1000) : null,
    lastLandingPath: touch.p ?? null,
    lastReferrer: touch.r ?? null,
    lastReferrerHost: touch.rh ?? null,
    lastUtmSource: touch.us ?? null,
    lastUtmMedium: touch.um ?? null,
    lastUtmCampaign: touch.uc ?? null,
    lastUtmTerm: touch.ut ?? null,
    lastUtmContent: touch.un ?? null,
    lastClickId: touch.ci ?? null,
    lastClickIdSource: touch.cs ?? null,
  };
}

async function insertInquiryWithReference(
  input: InquiryInput,
  submittedAt: Date,
  responseDueAt: Date,
): Promise<Inquiry> {
  // The reference column is uniquely indexed. Retry on the astronomically
  // unlikely collision rather than failing a real customer's submission.
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [row] = await db
        .insert(inquiries)
        .values({
          reference: generateReference(),
          eventType: input.eventType as Inquiry["eventType"],
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone ?? null,
          contactPreference:
            input.contactPreference as Inquiry["contactPreference"],
          eventDate: input.eventDate ?? null,
          eventDateFlexible: input.eventDateFlexible,
          guestCountMin: input.guestCountMin ?? null,
          guestCountMax: input.guestCountMax ?? null,
          venueStatus: (input.venueStatus ?? null) as Inquiry["venueStatus"],
          venueName: input.venueName ?? null,
          eventTown: input.eventTown ?? null,
          budgetBand: input.budgetBand ?? null,
          servicesNeeded: input.servicesNeeded,
          message: input.message ?? null,
          submittedAt,
          responseDueAt,
        })
        .returning();
      if (row) return row;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Anything other than a reference collision is a real failure.
      if (!message.includes("inquiries_reference_key")) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not allocate a unique inquiry reference.");
}

export async function createInquiry(
  input: InquiryInput,
  context: RequestContext,
  submittedFromPath: string,
): Promise<PersistedInquiry> {
  const jar = await cookies();
  const firstTouch = decodeTouch(jar.get(COOKIE_FIRST_TOUCH)?.value);
  const lastTouch = decodeTouch(jar.get(COOKIE_LAST_TOUCH)?.value);
  const visitor = decodeVisitor(jar.get(COOKIE_VISITOR)?.value);

  const submittedAt = new Date();
  const responseDueAt = new Date(
    submittedAt.getTime() + responseSlaHours() * 60 * 60 * 1000,
  );

  // Step 1: the lead. If this throws, the caller shows a real failure state
  // with a direct phone and email route so the customer is not lost.
  const inquiry = await insertInquiryWithReference(
    input,
    submittedAt,
    responseDueAt,
  );

  // Step 2: attribution. Best effort by design.
  let attributionCaptured = false;
  try {
    await db.insert(inquiryAttribution).values({
      inquiryId: inquiry.id,
      ...touchToFirstColumns(firstTouch),
      ...touchToLastColumns(lastTouch),
      sessionId: visitor?.sid ?? null,
      touchCount: visitor?.n ?? 1,
      submittedFromPath,
      userAgent: context.userAgent,
      ipHash: context.ipHash,
    });
    attributionCaptured = true;
  } catch (error) {
    console.error(
      "[inquiry] attribution write failed - lead %s is safe, attribution lost",
      inquiry.reference,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }

  return { inquiry, attributionCaptured };
}
