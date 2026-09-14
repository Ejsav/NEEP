import { NextResponse } from "next/server";
import { saveDraft } from "@/lib/inquiries/drafts";
import { draftInputSchema } from "@/lib/validation/inquiry";
import {
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  honeypotTripped,
  verifyFormToken,
} from "@/lib/security/form-token";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  getRequestContext,
  rateLimitKey,
} from "@/lib/security/request-context";
import { DRAFT_SCOPE } from "@/app/(marketing)/plan/form-state";

/**
 * Persists a partial planner response on a step transition.
 *
 * A Route Handler, NOT a Server Action, and the reason is worth recording.
 *
 * Every Server Action invocation makes Next refresh the route it was called
 * from. On this page that means re-rendering /plan, which is force-dynamic, and
 * reconciling the result into a form the customer is actively typing into. In
 * testing that refresh landed between two keystrokes and silently emptied the
 * name fields that had just been filled - the submission then failed validation
 * for fields the customer had demonstrably completed. Losing a customer's
 * typing to a background save of reporting data is not a trade worth making, so
 * the draft save moved off the action mechanism entirely.
 *
 * This is a public POST endpoint reachable by anyone, so it performs every
 * check itself, in the same order as the submit path: cheap rejections first,
 * database work last.
 *
 * It always answers 204. A draft is reporting data - the client neither waits
 * for it nor branches on it, and telling a prober which check rejected them
 * would be a free hint.
 */

const NO_CONTENT = new NextResponse(null, { status: 204 });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    if (honeypotTripped(formData.get(HONEYPOT_FIELD))) return NO_CONTENT;

    const context = await getRequestContext();

    const perIp = await consumeRateLimit(
      rateLimitKey("draft", context.ipHash),
      RATE_LIMITS.draftPerIp,
    );
    if (!perIp.allowed) return NO_CONTENT;

    const global = await consumeRateLimit("draft:global", RATE_LIMITS.draftGlobal);
    if (!global.allowed) return NO_CONTENT;

    // minAgeMs 0: a person who already knows what they are planning can pick it
    // and press Continue in well under the 2.5s human floor the submit path
    // uses. Rejecting that would break the flow on its first interaction. The
    // rate limiter above is what bounds abuse here.
    const verdict = verifyFormToken(
      formData.get(FORM_TOKEN_FIELD)?.toString(),
      DRAFT_SCOPE,
      new Date(),
      { minAgeMs: 0 },
    );
    if (!verdict.ok) return NO_CONTENT;

    const step = Number.parseInt(String(formData.get("step") ?? ""), 10);
    if (!Number.isFinite(step) || step < 1 || step > 5) return NO_CONTENT;

    const parsed = draftInputSchema.safeParse({
      eventType: formData.get("eventType") ?? undefined,
      eventDate: formData.get("eventDate") ?? undefined,
      eventDateFlexible: formData.get("eventDateFlexible") ?? undefined,
      guestCountMin: formData.get("guestCountMin") ?? undefined,
      guestCountMax: formData.get("guestCountMax") ?? undefined,
      eventTown: formData.get("eventTown") ?? undefined,
      venueStatus: formData.get("venueStatus") ?? undefined,
      venueName: formData.get("venueName") ?? undefined,
      scopeTier: formData.get("scopeTier") ?? undefined,
      budgetBand: formData.get("budgetBand") ?? undefined,
      servicesNeeded: formData.getAll("servicesNeeded").map(String),
    });

    // A partially-answered step is still worth keeping, but anything failing the
    // shared rules is dropped rather than coerced into the database.
    if (!parsed.success) return NO_CONTENT;

    await saveDraft(parsed.data, step, context);
    return NO_CONTENT;
  } catch (error) {
    console.error("[draft] step save failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NO_CONTENT;
  }
}
