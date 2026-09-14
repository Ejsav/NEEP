import type { FieldErrors } from "@/lib/validation/inquiry";

/**
 * Shared shapes for the planner.
 *
 * These live outside actions.ts because a "use server" module may only export
 * async functions - constants and types exported from one are a build error.
 */

export const FORM_SCOPE = "planner";
export const DRAFT_SCOPE = "planner-draft";

export type PlannerFormState = {
  status: "idle" | "success" | "error";
  /** Errors keyed by field name, rendered next to the input. */
  fieldErrors?: FieldErrors;
  /** A message about the submission as a whole. */
  formError?: string;
  /** Present on success so the customer has something to quote back to us. */
  reference?: string;
  /** Hours the company has committed to responding within. */
  slaHours?: number;
  /**
   * Set when the lead could not be saved. The UI uses this to show direct
   * contact routes instead of pretending the submission worked.
   */
  persistenceFailed?: boolean;
  /** Correlation id printed to the user and the server log on a hard failure. */
  incidentId?: string;
  /** Echoed so the client can repopulate the form after a failed submit. */
  values?: Record<string, string | string[]>;
};

export const initialPlannerState: PlannerFormState = { status: "idle" };

/** Prefill for a returning visitor whose draft is still active. */
export type PlannerDefaults = {
  eventType?: string;
  eventDate?: string;
  eventDateFlexible?: boolean;
  guestCountMin?: string;
  guestCountMax?: string;
  eventTown?: string;
  venueStatus?: string;
  venueName?: string;
  scopeTier?: string;
  budgetBand?: string;
  servicesNeeded?: string[];
  /** Highest step the visitor previously reached, so we can resume there. */
  resumeStep?: number;
};
