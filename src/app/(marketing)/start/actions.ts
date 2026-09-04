"use server";

import { randomUUID } from "node:crypto";
import {
  inquiryInputSchema,
  looksLikeSpam,
  toFieldErrors,
} from "@/lib/validation/inquiry";
import {
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  honeypotTripped,
  verifyFormToken,
} from "@/lib/security/form-token";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import {
  getRequestContext,
  rateLimitKey,
} from "@/lib/security/request-context";
import { createInquiry } from "@/lib/inquiries/create";
import { notifyNewInquiry } from "@/lib/notify";
import { responseSlaHours } from "@/lib/env";
import { FORM_SCOPE, type InquiryFormState } from "./form-state";

/**
 * Inquiry submission.
 *
 * A Server Action rather than a Route Handler so the form submits and re-renders
 * its errors inline with JavaScript disabled, in one roundtrip. Next's docs are
 * explicit that an action is a public POST endpoint reachable by anyone, so this
 * function treats every input as hostile and performs its own rate limiting,
 * token verification and validation. Render-time gating is not a boundary.
 *
 * Order is deliberate: cheap rejections first, database work last.
 */

/** Re-serialises the submission so a rejected form does not lose the user's typing. */
function echoValues(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key === FORM_TOKEN_FIELD || key === HONEYPOT_FIELD) continue;
    if (typeof value !== "string") continue;
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}

/** Silent success. A bot gets the same response a person does and learns nothing. */
function decoySuccess(): InquiryFormState {
  return {
    status: "success",
    reference: undefined,
    slaHours: responseSlaHours(),
  };
}

export async function submitInquiry(
  _previous: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const context = await getRequestContext();
  const values = echoValues(formData);

  // 1. Honeypot. A field no human can see was filled in.
  if (honeypotTripped(formData.get(HONEYPOT_FIELD))) {
    console.warn("[inquiry] honeypot tripped", { ipHash: context.ipHash });
    return decoySuccess();
  }

  // 2. Rate limit before any expensive work.
  const perIp = await consumeRateLimit(
    rateLimitKey("inquiry", context.ipHash),
    RATE_LIMITS.inquiryPerIp,
  );
  if (!perIp.allowed) {
    return {
      status: "error",
      values,
      formError:
        "We've received several inquiries from your connection already. " +
        "If that wasn't you, or you need us urgently, please contact us directly.",
    };
  }

  const global = await consumeRateLimit("inquiry:global", RATE_LIMITS.inquiryGlobal);
  if (!global.allowed) {
    console.error("[inquiry] global rate limit reached");
    return {
      status: "error",
      values,
      formError:
        "We're getting an unusual volume of submissions right now. " +
        "Please try again in a few minutes, or contact us directly.",
    };
  }

  // 3. Signed form token: CSRF, timing and staleness in one check.
  const tokenVerdict = verifyFormToken(
    formData.get(FORM_TOKEN_FIELD)?.toString(),
    FORM_SCOPE,
  );
  if (!tokenVerdict.ok) {
    if (tokenVerdict.reason === "too_fast") {
      console.warn("[inquiry] rejected: submitted too fast", {
        ipHash: context.ipHash,
      });
      return decoySuccess();
    }
    if (tokenVerdict.reason === "expired") {
      return {
        status: "error",
        values,
        formError:
          "This form was open for a while and the session expired. " +
          "Please submit again - your answers are still here.",
      };
    }
    console.warn("[inquiry] rejected: bad form token", {
      reason: tokenVerdict.reason,
      ipHash: context.ipHash,
    });
    return {
      status: "error",
      values,
      formError:
        "We couldn't verify this submission. Please reload the page and try again.",
    };
  }

  // 4. Authoritative validation. The browser's checks are a courtesy; this is law.
  const raw = {
    eventType: formData.get("eventType"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    contactPreference: formData.get("contactPreference") ?? "either",
    eventDate: formData.get("eventDate"),
    eventDateFlexible: formData.get("eventDateFlexible"),
    guestCountMin: formData.get("guestCountMin"),
    guestCountMax: formData.get("guestCountMax"),
    venueStatus: formData.get("venueStatus") || undefined,
    venueName: formData.get("venueName"),
    eventTown: formData.get("eventTown"),
    budgetBand: formData.get("budgetBand") || undefined,
    servicesNeeded: formData.getAll("servicesNeeded").map(String),
    message: formData.get("message"),
  };

  const parsed = inquiryInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      values,
      fieldErrors: toFieldErrors(parsed.error),
      formError: "Please check the highlighted fields and try again.",
    };
  }

  // 5. Content heuristics for spam that cleared the mechanical checks.
  const spamReason = looksLikeSpam(parsed.data);
  if (spamReason) {
    console.warn("[inquiry] classified as spam", {
      reason: spamReason,
      ipHash: context.ipHash,
    });
    return decoySuccess();
  }

  // 6. Persist. This is the only step whose failure loses a customer.
  const submittedFromPath = "/start";
  try {
    const { inquiry, attributionCaptured } = await createInquiry(
      parsed.data,
      context,
      submittedFromPath,
    );

    if (!attributionCaptured) {
      console.warn("[inquiry] stored without attribution", {
        reference: inquiry.reference,
      });
    }

    // 7. Notify. Never allowed to fail the submission - the lead is already safe.
    const outcome = await notifyNewInquiry(inquiry);
    if (outcome.status !== "sent") {
      console.warn("[inquiry] notification not delivered", {
        reference: inquiry.reference,
        status: outcome.status,
        detail: outcome.detail,
      });
    }

    return {
      status: "success",
      reference: inquiry.reference,
      slaHours: responseSlaHours(),
    };
  } catch (error) {
    // The lead did not save. Say so plainly and hand over a direct route.
    const incidentId = randomUUID();
    console.error("[inquiry] PERSISTENCE FAILED - a lead may have been lost", {
      incidentId,
      ipHash: context.ipHash,
      email: parsed.data.email,
      error: error instanceof Error ? error.stack : String(error),
    });
    return {
      status: "error",
      values,
      persistenceFailed: true,
      incidentId,
      formError:
        "Something went wrong on our end and your inquiry was not saved. " +
        "This is our fault, not yours.",
    };
  }
}
