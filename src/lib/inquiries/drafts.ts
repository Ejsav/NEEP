import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { funnelEvents, inquiryDrafts } from "@/lib/db/schema";
import type { InquiryDraft } from "@/lib/db/schema";
import { hmac } from "@/lib/security/hash";
import type { DraftInput } from "@/lib/validation/inquiry";
import type { RequestContext } from "@/lib/security/request-context";

/**
 * Partial planner responses.
 *
 * The single highest-value thing in the build: no competitor in the benchmark
 * set captures anything from a funnel the visitor abandons, so a drop-off at
 * step 3 that still tells us "wedding, next September, 120 guests, no venue" is
 * intelligence nobody else in this market has.
 *
 * TWO RULES GOVERN THIS MODULE.
 *
 * 1. NO PII. Ever. Name, email and phone live on step 5 and are written only by
 *    a real submission. Storing contact details somebody typed but never sent
 *    is a consent problem we decline to create. The draft is a record of a
 *    *funnel*, not of a person.
 *
 * 2. NEVER BLOCK THE CUSTOMER. Every function here fails soft. A draft is
 *    reporting data; the lead is the asset. If this module throws, the planner
 *    must carry on and the submission must still work.
 */

export const DRAFT_COOKIE = "neep_draft";
const DRAFT_TTL_SECONDS = 12 * 60 * 60;

/** Drafts untouched for this long are treated as abandoned when reporting. */
export const ABANDON_AFTER_MINUTES = 30;

function newDraftToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Only the HMAC is stored. Same discipline as session tokens and IP addresses:
 * a database dump must not yield anything that can be replayed.
 */
function tokenHashFor(token: string): string {
  return hmac(`draft:${token}`);
}

export async function readDraftToken(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(DRAFT_COOKIE)?.value;
  return value && value.trim() !== "" ? value : null;
}

async function writeDraftCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(DRAFT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DRAFT_TTL_SECONDS,
  });
}

export async function clearDraftCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(DRAFT_COOKIE);
}

/** Columns a draft is permitted to hold. Contact fields are absent by design. */
function draftColumns(input: DraftInput) {
  return {
    eventType: (input.eventType ?? null) as InquiryDraft["eventType"],
    eventDate: input.eventDate ?? null,
    eventDateFlexible: input.eventDateFlexible ?? false,
    guestCountMin: input.guestCountMin ?? null,
    guestCountMax: input.guestCountMax ?? null,
    eventTown: input.eventTown ?? null,
    venueStatus: (input.venueStatus ?? null) as InquiryDraft["venueStatus"],
    venueName: input.venueName ?? null,
    scopeTier: (input.scopeTier ?? null) as InquiryDraft["scopeTier"],
    budgetBand: input.budgetBand ?? null,
    servicesNeeded: input.servicesNeeded ?? [],
  };
}

export type SaveDraftResult = {
  draftId: string | null;
  /** The token to set as a cookie, when a new draft was created. */
  issuedToken: string | null;
};

/**
 * Upserts the draft for the current visitor and records the step transition.
 *
 * Keyed on the cookie token so five step-saves produce one row, not five. The
 * unique index on token_hash makes that a database guarantee under concurrent
 * saves, rather than a read-then-write race.
 */
export async function saveDraft(
  input: DraftInput,
  step: number,
  context: RequestContext,
): Promise<SaveDraftResult> {
  try {
    const existing = await readDraftToken();
    const token = existing ?? newDraftToken();
    const tokenHash = tokenHashFor(token);

    const [row] = await db
      .insert(inquiryDrafts)
      .values({
        tokenHash,
        ...draftColumns(input),
        furthestStep: step,
        ipHash: context.ipHash,
      })
      .onConflictDoUpdate({
        target: inquiryDrafts.tokenHash,
        set: {
          ...draftColumns(input),
          // Never walk backwards: someone who reached step 4 and navigated back
          // to step 2 still got to step 4, and the drop-off report needs that.
          furthestStep: sql`greatest(${inquiryDrafts.furthestStep}, ${step})`,
          updatedAt: new Date(),
        },
        // A draft that already converted is finished. Re-saving into it would
        // corrupt a record that a real inquiry now points at.
        setWhere: eq(inquiryDrafts.status, "active"),
      })
      .returning({ id: inquiryDrafts.id });

    if (!row) return { draftId: null, issuedToken: null };

    if (!existing) await writeDraftCookie(token);

    await recordFunnelEvent(row.id, step, "enter", context);
    return { draftId: row.id, issuedToken: existing ? null : token };
  } catch (error) {
    // Reporting data is never worth failing a customer's step transition over.
    console.error("[draft] save failed", {
      step,
      error: error instanceof Error ? error.message : String(error),
    });
    return { draftId: null, issuedToken: null };
  }
}

export async function recordFunnelEvent(
  draftId: string,
  step: number,
  action: "enter" | "exit" | "submit" | "error",
  context: RequestContext,
): Promise<void> {
  try {
    await db.insert(funnelEvents).values({
      draftId,
      step,
      action,
      ipHash: context.ipHash,
    });
  } catch (error) {
    console.error("[draft] funnel event write failed", {
      draftId,
      step,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The current visitor's active draft, if they have one. */
export async function getActiveDraft(): Promise<InquiryDraft | null> {
  try {
    const token = await readDraftToken();
    if (!token) return null;

    const [row] = await db
      .select()
      .from(inquiryDrafts)
      .where(
        and(
          eq(inquiryDrafts.tokenHash, tokenHashFor(token)),
          eq(inquiryDrafts.status, "active"),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("[draft] read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Marks the visitor's draft as converted and links it to the inquiry.
 *
 * Called after the inquiry has already committed, so a failure here loses the
 * funnel linkage and nothing else. `inquiries.draft_id` is uniquely indexed,
 * which is what actually guarantees one inquiry per draft.
 */
export async function convertDraft(
  draftId: string,
  inquiryId: string,
): Promise<void> {
  try {
    await db
      .update(inquiryDrafts)
      .set({
        status: "converted",
        convertedInquiryId: inquiryId,
        updatedAt: new Date(),
      })
      .where(eq(inquiryDrafts.id, draftId));
  } catch (error) {
    console.error("[draft] conversion failed - inquiry %s is safe", inquiryId, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
