/**
 * Planner step definitions.
 *
 * DELIBERATELY IMPORT-FREE, and it must stay that way.
 *
 * These constants are needed by the client component that renders the wizard.
 * They previously lived in `lib/validation/inquiry.ts`, which imports Zod - so
 * importing one small array dragged the entire validation library into the
 * client bundle and put 90KB gzipped on the planner route. The performance
 * budget caught it. This is the same boundary failure `lib/security/
 * form-fields.ts` exists to prevent, and it has the same fix: constants the
 * client needs live in a module with no dependencies at all.
 *
 * Contact details are last on purpose, and they are the only PII in the flow -
 * which is what lets every earlier step persist to a draft that carries none.
 */

export const PLANNER_STEPS = [
  {
    step: 1,
    id: "event",
    legend: "What are you planning?",
    fields: ["eventType"],
  },
  {
    step: 2,
    id: "date",
    legend: "When, and how many people?",
    fields: [
      "eventDate",
      "eventDateFlexible",
      "guestCountMin",
      "guestCountMax",
      "eventTown",
    ],
  },
  {
    step: 3,
    id: "venue",
    legend: "Where are you at with a venue?",
    fields: ["venueStatus", "venueName"],
  },
  {
    step: 4,
    id: "scope",
    legend: "How much do you want us to run?",
    fields: ["scopeTier", "budgetBand", "servicesNeeded"],
  },
  {
    step: 5,
    id: "contact",
    legend: "How do we reach you?",
    fields: [
      "firstName",
      "lastName",
      "email",
      "phone",
      "contactPreference",
      "message",
    ],
  },
] as const;

export type PlannerStep = (typeof PLANNER_STEPS)[number];
export const FINAL_STEP = PLANNER_STEPS[PLANNER_STEPS.length - 1].step;

/** Fields a draft may hold. Contact fields are excluded - drafts carry no PII. */
export const DRAFT_FIELDS = [
  "eventType",
  "eventDate",
  "eventDateFlexible",
  "guestCountMin",
  "guestCountMax",
  "eventTown",
  "venueStatus",
  "venueName",
  "scopeTier",
  "budgetBand",
  "servicesNeeded",
] as const;

export type DraftField = (typeof DRAFT_FIELDS)[number];
