import { z } from "zod";
// Re-exported below so existing server-side imports keep working. The module
// itself has no dependencies, which is the entire point - see its header.
import { DRAFT_FIELDS, FINAL_STEP, PLANNER_STEPS } from "@/lib/domain/planner-steps";
import {
  BUDGET_BAND_VALUES,
  CONTACT_PREFERENCE_VALUES,
  EVENT_TYPE_VALUES,
  SCOPE_TIER_VALUES,
  SERVICE_VALUES,
  VENUE_STATUS_VALUES,
} from "@/lib/domain/inquiry-options";

/**
 * Authoritative inquiry validation.
 *
 * The browser gets the same rules for usability, but this module is the only
 * thing that decides whether a submission is valid. Nothing that reaches the
 * database bypasses it.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * Strips control characters and collapses runs of whitespace. This is hygiene,
 * not escaping: React escapes on render and Drizzle parameterises every query,
 * so we are not relying on this for injection safety.
 */
function sanitize(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(CONTROL_CHARS, "").replace(/[ \t]+/g, " ").trim();
}

const cleanString = (schema: z.ZodString) => z.preprocess(sanitize, schema);

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      const cleaned = sanitize(v);
      return cleaned === "" ? undefined : cleaned;
    },
    z.string().max(max).optional(),
  );

/**
 * Permissive by design. Rejecting a real customer's unusual but valid address
 * costs a booking; a malformed one costs one bounced email. Zod's built-in
 * email check plus a length cap is the right level of strictness here.
 */
const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z
    .email("That doesn't look like a valid email address.")
    .min(3, "Enter your email address.")
    .max(254, "That email address is too long."),
);

/** Accepts the ways people actually type US numbers. Stored as entered. */
const phoneSchema = z.preprocess(
  (v) => {
    const cleaned = sanitize(v);
    return cleaned === "" ? undefined : cleaned;
  },
  z
    .string()
    .min(7, "That phone number looks too short.")
    .max(32, "That phone number looks too long.")
    .refine(
      (value) => (value.match(/\d/g) ?? []).length >= 10,
      "Enter a full phone number, including area code.",
    )
    .optional(),
);

/**
 * Dates are bounded rather than merely parsed. A wedding "in 1998" or "in 2094"
 * is a typo or a bot, and either way it should not reach the pipeline.
 */
const MAX_YEARS_AHEAD = 5;

const eventDateSchema = z.preprocess(
  (v) => {
    const cleaned = sanitize(v);
    return cleaned === "" ? undefined : cleaned;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker or enter YYYY-MM-DD.")
    .refine((value) => {
      const parsed = new Date(`${value}T12:00:00Z`);
      return !Number.isNaN(parsed.getTime());
    }, "That date doesn't exist.")
    .refine((value) => {
      const parsed = new Date(`${value}T12:00:00Z`);
      const earliest = new Date();
      earliest.setUTCHours(0, 0, 0, 0);
      earliest.setUTCDate(earliest.getUTCDate() - 1);
      return parsed >= earliest;
    }, "That date has already passed.")
    .refine((value) => {
      const parsed = new Date(`${value}T12:00:00Z`);
      const latest = new Date();
      latest.setUTCFullYear(latest.getUTCFullYear() + MAX_YEARS_AHEAD);
      return parsed <= latest;
    }, `We plan up to ${MAX_YEARS_AHEAD} years out. Call us if you're further ahead.`)
    .optional(),
);

const guestCountSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const parsed = Number.parseInt(String(v).replace(/[,\s]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : v;
  },
  z
    .number()
    .int("Enter a whole number of guests.")
    .min(1, "Enter at least 1 guest.")
    .max(20000, "Enter a realistic guest count.")
    .optional(),
);

/**
 * The field rules, before any cross-field checks.
 *
 * Split out because Zod v4 refuses `.pick()` on a schema that carries
 * refinements - a runtime error, not a type error, so it only surfaces when the
 * code runs. Keeping the plain object separate lets the draft schema pick from
 * exactly the same field definitions the submit schema uses, which is the point:
 * a rule can never drift between "valid at step 3" and "valid on submit".
 */
const inquiryObjectSchema = z
  .object({
    eventType: z.enum(EVENT_TYPE_VALUES as [string, ...string[]], {
      message: "Choose the kind of event you're planning.",
    }),

    firstName: cleanString(
      z
        .string()
        .min(1, "Enter your first name.")
        .max(80, "That first name is too long."),
    ),
    lastName: cleanString(
      z
        .string()
        .min(1, "Enter your last name.")
        .max(80, "That last name is too long."),
    ),
    email: emailSchema,
    phone: phoneSchema,
    contactPreference: z
      .enum(CONTACT_PREFERENCE_VALUES as [string, ...string[]])
      .default("either"),

    eventDate: eventDateSchema,
    eventDateFlexible: z.preprocess(
      (v) => v === true || v === "on" || v === "true",
      z.boolean().default(false),
    ),
    guestCountMin: guestCountSchema,
    guestCountMax: guestCountSchema,

    venueStatus: z
      .enum(VENUE_STATUS_VALUES as [string, ...string[]])
      .optional(),
    venueName: optionalText(160),
    eventTown: optionalText(80),
    budgetBand: z.enum(BUDGET_BAND_VALUES as [string, ...string[]]).optional(),
    scopeTier: z.enum(SCOPE_TIER_VALUES as [string, ...string[]]).optional(),

    servicesNeeded: z
      .array(z.enum(SERVICE_VALUES as [string, ...string[]]))
      .max(SERVICE_VALUES.length)
      .default([]),

    message: optionalText(4000),
  });

/**
 * Authoritative submit schema: the field rules plus the cross-field checks that
 * only make sense for a finished submission.
 */
export const inquiryInputSchema = inquiryObjectSchema
  .superRefine((data, ctx) => {
    if (
      data.guestCountMin !== undefined &&
      data.guestCountMax !== undefined &&
      data.guestCountMin > data.guestCountMax
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["guestCountMax"],
        message: "The maximum can't be lower than the minimum.",
      });
    }

    // A date is required unless the customer has explicitly said they're flexible.
    if (!data.eventDate && !data.eventDateFlexible) {
      ctx.addIssue({
        code: "custom",
        path: ["eventDate"],
        message:
          "Give us a target date, or tick the box to say you're still flexible.",
      });
    }

    // We need at least one way to reach them back.
    if (data.contactPreference === "phone" && !data.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Add a phone number, or change how you'd like us to reach you.",
      });
    }
  });

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

export { DRAFT_FIELDS, FINAL_STEP, PLANNER_STEPS };
export type { DraftField, PlannerStep } from "@/lib/domain/planner-steps";

/**
 * The draft shape: the whole-form rules, restricted to non-PII fields and made
 * entirely optional, because a half-answered step is still worth persisting.
 *
 * Each field keeps its own preprocessing and bounds from the shared object - a
 * draft still refuses a wedding in 1998. What it does not carry is the
 * cross-field `superRefine`, which is correct: "give a date or tick flexible"
 * is a rule about a finished submission, not about a draft in progress.
 */
export const draftInputSchema = inquiryObjectSchema
  .pick({
    eventType: true,
    eventDate: true,
    eventDateFlexible: true,
    guestCountMin: true,
    guestCountMax: true,
    eventTown: true,
    venueStatus: true,
    venueName: true,
    scopeTier: true,
    budgetBand: true,
    servicesNeeded: true,
  })
  .partial();

export type DraftInput = z.infer<typeof draftInputSchema>;

/** Field-keyed error map, shaped for direct rendering next to inputs. */
export type FieldErrors = Record<string, string[]>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Content heuristics for spam that clears the honeypot and timing checks.
 * Deliberately conservative: a false positive here silently loses a real
 * customer, so we only flag patterns a genuine inquiry would not produce.
 */
export function looksLikeSpam(input: InquiryInput): string | null {
  const message = input.message ?? "";
  const linkCount = (message.match(/https?:\/\//gi) ?? []).length;
  if (linkCount >= 3) return "message_link_count";
  if (/\[url=|\[link=|<a\s+href=/i.test(message)) return "message_markup";
  if (/\b(seo services|backlinks|crypto investment|casino|viagra)\b/i.test(message)) {
    return "message_keyword";
  }
  // Names are not URLs.
  if (/https?:\/\//i.test(`${input.firstName} ${input.lastName}`)) {
    return "name_url";
  }
  return null;
}
