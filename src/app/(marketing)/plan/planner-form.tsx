"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, describedBy, inputClasses } from "@/components/ui/field";
import {
  BUDGET_BANDS,
  CONTACT_PREFERENCES,
  EVENT_TYPES,
  SCOPE_TIERS,
  SERVICE_OPTIONS,
  VENUE_STATUSES,
  servicesFor,
  type EventTypeValue,
} from "@/lib/domain/inquiry-options";
import { PLANNER_STEPS, FINAL_STEP } from "@/lib/domain/planner-steps";
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/security/form-fields";
// Safe in a client component: every value is a NEXT_PUBLIC_* variable inlined at
// build time, and the module imports nothing server-only.
import { siteConfig } from "@/lib/site-config";
import { submitPlan } from "./actions";
import {
  initialPlannerState,
  type PlannerDefaults,
  type PlannerFormState,
} from "./form-state";

/**
 * The guided planner.
 *
 * ONE FORM, TWO EXPERIENCES. Every step is a real <fieldset> inside a single
 * <form>, rendered by the server with all steps visible. JavaScript then hides
 * the inactive ones and adds Back/Next. With JavaScript disabled the visitor
 * sees one honest long form and submits it in a single post - the same Server
 * Action, the same validation, the same result. This is the only arrangement
 * that keeps the shipped no-JS guarantee with one code path.
 *
 * Inactive steps get `hidden` AND `inert`. `hidden` alone still leaves the
 * fields reachable by keyboard and announced by screen readers, and browser
 * autofill will happily populate them.
 *
 * Step visibility is applied imperatively rather than rendered from state,
 * because state would put `hidden` into the server-rendered HTML - and then a
 * visitor without JavaScript would be looking at a form with four invisible
 * steps that nothing will ever reveal.
 */

/** Which step owns a given field, so a server error can jump to it. */
function stepForField(field: string): number {
  for (const s of PLANNER_STEPS) {
    if ((s.fields as readonly string[]).includes(field)) return s.step;
  }
  return FINAL_STEP;
}

export function PlannerForm({
  formToken,
  draftToken,
  slaHours,
  defaults,
  turnstileSiteKey,
  children,
}: {
  formToken: string;
  draftToken: string;
  slaHours: number;
  defaults: PlannerDefaults;
  turnstileSiteKey: string | null;
  /**
   * The page's own intro block, passed in rather than rendered as a sibling so
   * it can disappear on success. "Five short questions, about ninety seconds"
   * sitting above a receipt is an instruction to do something already done.
   * Server-rendered content handed to a client component costs no bundle.
   */
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<PlannerFormState, FormData>(
    submitPlan,
    initialPlannerState,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(defaults.resumeStep ?? 1);
  const [eventType, setEventType] = useState<EventTypeValue | "">(
    (defaults.eventType as EventTypeValue) ?? "",
  );

  /** Applies visibility to the DOM. Not React state: see the note above. */
  const applyStep = useCallback((next: number) => {
    const form = formRef.current;
    if (!form) return;
    for (const s of PLANNER_STEPS) {
      const node = form.querySelector<HTMLFieldSetElement>(
        `[data-planner-step="${s.step}"]`,
      );
      if (!node) continue;
      const active = s.step === next;
      node.hidden = !active;
      node.inert = !active;
    }
    form.dataset.step = String(next);
  }, []);

  /*
   * A server-side error must not leave the visitor staring at a step that looks
   * fine, so a failed submit jumps to the first step that actually has a
   * problem. Derived during render rather than in an effect: this is React's
   * sanctioned "adjust state when an input changes" pattern, and doing it in an
   * effect would be the cascading-render mistake React 19 lints against.
   */
  const { phone, phoneDisplay, email } = siteConfig.contact;

  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "error" && state.fieldErrors) {
      const first = Object.keys(state.fieldErrors)[0];
      if (first) setStep(stepForField(first));
    }
  }

  /*
   * The one effect. It only touches the DOM - marking the form enhanced and
   * syncing step visibility - which is exactly what effects are for. Until it
   * runs, the page is a plain long form, which is the no-JS experience.
   */
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.dataset.enhanced = "true";
    applyStep(step);
  }, [applyStep, step]);

  function goTo(next: number) {
    setStep(next);
    // Focus moves to the new step's heading so a screen reader and a keyboard
    // user both land where the content actually changed.
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>(`[data-planner-step="${next}"] h2`)
        ?.focus();
    });
  }

  /** Native constraint validation, scoped to the step being left. */
  function stepIsValid(current: number): boolean {
    const form = formRef.current;
    if (!form) return true;
    const node = form.querySelector<HTMLFieldSetElement>(
      `[data-planner-step="${current}"]`,
    );
    if (!node) return true;

    for (const control of node.querySelectorAll<HTMLInputElement>(
      "input, select, textarea",
    )) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }
    return true;
  }

  function next(event: React.MouseEvent<HTMLButtonElement>) {
    // Belt and braces with the distinct keys below: this click must never end
    // up submitting the form, whatever the node it lands on becomes.
    event.preventDefault();
    if (!stepIsValid(step)) return;

    // Persist what we have before moving on.
    //
    // Fire-and-forget: the draft is reporting data and the customer must never
    // wait on it. `keepalive` so a save started as someone closes the tab still
    // completes - an abandoned funnel is exactly the case this feature exists
    // for, and it is the one where the page is going away.
    const form = formRef.current;
    if (form) {
      const data = new FormData(form);
      data.set("step", String(step));
      data.set(FORM_TOKEN_FIELD, draftToken);
      void fetch("/api/draft", { method: "POST", body: data, keepalive: true }).catch(
        () => {
          // Nothing to do and nothing to tell the customer. The lead is what
          // matters and it is not affected by this.
        },
      );
    }

    goTo(Math.min(step + 1, FINAL_STEP));
  }

  if (state.status === "success") {
    return <Receipt reference={state.reference} slaHours={state.slaHours ?? slaHours} />;
  }

  const visibleServices = eventType ? servicesFor(eventType) : SERVICE_OPTIONS;
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  function value(name: string, fallback?: string): string | undefined {
    const echoed = values[name];
    if (typeof echoed === "string") return echoed;
    return fallback;
  }

  function checkedIn(name: string, candidate: string, fallback: string[]): boolean {
    const echoed = values[name];
    if (Array.isArray(echoed)) return echoed.includes(candidate);
    if (typeof echoed === "string") return echoed === candidate;
    return fallback.includes(candidate);
  }

  return (
    <>
      {children}
      <form
        ref={formRef}
        action={formAction}
        data-enhanced="false"
        // Server validation is authoritative (CLAUDE.md). Native validation is
        // suppressed at form level so a no-JS submission reaches the server and
        // gets its real answer; the wizard still calls checkValidity() per step,
        // which works regardless of this attribute.
        noValidate
        className="planner flex flex-col gap-8"
      >
        <input type="hidden" name={FORM_TOKEN_FIELD} value={formToken} />
        {/*
          A field no human can see. Visually hidden rather than display:none,
          because some bots skip what is display:none.
        */}
        <div
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
        >
          <label htmlFor={HONEYPOT_FIELD}>Company website</label>
          <input
            id={HONEYPOT_FIELD}
            name={HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <Progress step={step} />

        {/* ------------------------------------------------------ 1. event type */}
        <Step step={1} legend="What are you planning?">
          <FieldGroup
            legend="Event type"
            name="eventType"
            errors={errors.eventType}
            hint="Pick the closest fit. We'll sort out the detail together."
          >
            <div className="grid gap-2.5">
              {EVENT_TYPES.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper-raised p-4 transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={option.value}
                    required
                    defaultChecked={checkedIn("eventType", option.value, defaults.eventType ? [defaults.eventType] : [])}
                    onChange={() => setEventType(option.value)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                    aria-describedby={describedBy("eventType", true, Boolean(errors.eventType))}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-body font-medium text-ink">{option.label}</span>
                    <span className="text-small text-ink-muted">{option.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </FieldGroup>
        </Step>

        {/* --------------------------------------------------- 2. date and size */}
        <Step step={2} legend="When, and how many people?">
          <Field
            name="eventDate"
            label="Event date"
            errors={errors.eventDate}
            hint="If you're still deciding, tick the box below instead."
          >
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              defaultValue={value("eventDate", defaults.eventDate)}
              className={inputClasses}
              aria-invalid={Boolean(errors.eventDate)}
              aria-describedby={describedBy("eventDate", true, Boolean(errors.eventDate))}
            />
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-small text-ink">
            <input
              type="checkbox"
              name="eventDateFlexible"
              defaultChecked={
                values.eventDateFlexible !== undefined
                  ? Boolean(values.eventDateFlexible)
                  : defaults.eventDateFlexible
              }
              className="h-5 w-5 shrink-0 rounded-sm accent-accent"
            />
            My date is still flexible
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="guestCountMin" label="Guests, roughly from" errors={errors.guestCountMin}>
              <input
                id="guestCountMin"
                name="guestCountMin"
                type="number"
                inputMode="numeric"
                min={1}
                max={20000}
                defaultValue={value("guestCountMin", defaults.guestCountMin)}
                className={inputClasses}
                aria-invalid={Boolean(errors.guestCountMin)}
                aria-describedby={describedBy("guestCountMin", false, Boolean(errors.guestCountMin))}
              />
            </Field>
            <Field name="guestCountMax" label="up to" errors={errors.guestCountMax}>
              <input
                id="guestCountMax"
                name="guestCountMax"
                type="number"
                inputMode="numeric"
                min={1}
                max={20000}
                defaultValue={value("guestCountMax", defaults.guestCountMax)}
                className={inputClasses}
                aria-invalid={Boolean(errors.guestCountMax)}
                aria-describedby={describedBy("guestCountMax", false, Boolean(errors.guestCountMax))}
              />
            </Field>
          </div>

          <Field
            name="eventTown"
            label="Town or area"
            errors={errors.eventTown}
            hint="Connecticut only, for now. If you're elsewhere in New England, say so and we'll be straight with you."
          >
            <input
              id="eventTown"
              name="eventTown"
              type="text"
              maxLength={80}
              autoComplete="address-level2"
              defaultValue={value("eventTown", defaults.eventTown)}
              className={inputClasses}
              aria-invalid={Boolean(errors.eventTown)}
              aria-describedby={describedBy("eventTown", true, Boolean(errors.eventTown))}
            />
          </Field>
        </Step>

        {/* ------------------------------------------------------- 3. the venue */}
        <Step step={3} legend="Where are you at with a venue?">
          <FieldGroup legend="Venue status" name="venueStatus" errors={errors.venueStatus}>
            <div className="grid gap-2 sm:grid-cols-2">
              {VENUE_STATUSES.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="venueStatus"
                    value={option.value}
                    defaultChecked={checkedIn("venueStatus", option.value, defaults.venueStatus ? [defaults.venueStatus] : [])}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </FieldGroup>

          <Field
            name="venueName"
            label="Venue name"
            errors={errors.venueName}
            hint="If you have one in mind or already booked, naming it helps us give you a straighter answer."
          >
            <input
              id="venueName"
              name="venueName"
              type="text"
              maxLength={160}
              defaultValue={value("venueName", defaults.venueName)}
              className={inputClasses}
              aria-invalid={Boolean(errors.venueName)}
              aria-describedby={describedBy("venueName", true, Boolean(errors.venueName))}
            />
          </Field>
        </Step>

        {/* ------------------------------------------------- 4. scope and budget */}
        <Step step={4} legend="How much do you want us to run?">
          <FieldGroup
            legend="Level of support"
            name="scopeTier"
            errors={errors.scopeTier}
            hint="You can change this later. It just tells us what kind of conversation to have."
          >
            <div className="grid gap-2.5">
              {SCOPE_TIERS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper-raised p-4 transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="scopeTier"
                    value={option.value}
                    defaultChecked={checkedIn("scopeTier", option.value, defaults.scopeTier ? [defaults.scopeTier] : [])}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-body font-medium text-ink">{option.label}</span>
                    <span className="text-small text-ink-muted">{option.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup
            legend="Total event budget"
            name="budgetBand"
            errors={errors.budgetBand}
            hint="Your budget for the whole event, not our fee. Bands, because nobody has an exact number this early."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {BUDGET_BANDS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="budgetBand"
                    value={option.value}
                    defaultChecked={checkedIn("budgetBand", option.value, defaults.budgetBand ? [defaults.budgetBand] : [])}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup
            legend="Anything specific you want handled?"
            name="servicesNeeded"
            errors={errors.servicesNeeded}
            hint="Optional. Tick what's on your mind."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleServices.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-paper-raised p-3 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="checkbox"
                    name="servicesNeeded"
                    value={option.value}
                    defaultChecked={checkedIn("servicesNeeded", option.value, defaults.servicesNeeded ?? [])}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-sm accent-accent"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </FieldGroup>
        </Step>

        {/* ----------------------------------------------------- 5. the contact */}
        <Step step={5} legend="How do we reach you?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="firstName" label="First name" required errors={errors.firstName}>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                maxLength={80}
                autoComplete="given-name"
                defaultValue={value("firstName")}
                className={inputClasses}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={describedBy("firstName", false, Boolean(errors.firstName))}
              />
            </Field>
            <Field name="lastName" label="Last name" required errors={errors.lastName}>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                maxLength={80}
                autoComplete="family-name"
                defaultValue={value("lastName")}
                className={inputClasses}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={describedBy("lastName", false, Boolean(errors.lastName))}
              />
            </Field>
          </div>

          <Field name="email" label="Email" required errors={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              defaultValue={value("email")}
              className={inputClasses}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email", false, Boolean(errors.email))}
            />
          </Field>

          <Field
            name="phone"
            label="Phone"
            errors={errors.phone}
            hint="Faster for anything time-sensitive."
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              defaultValue={value("phone")}
              className={inputClasses}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy("phone", true, Boolean(errors.phone))}
            />
          </Field>

          <FieldGroup legend="How should we reach you?" name="contactPreference" errors={errors.contactPreference}>
            <div className="flex flex-wrap gap-2">
              {CONTACT_PREFERENCES.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="contactPreference"
                    value={option.value}
                    defaultChecked={checkedIn("contactPreference", option.value, ["either"])}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </FieldGroup>

          <Field
            name="message"
            label="Anything else we should know?"
            errors={errors.message}
            hint="Optional. The thing you're most worried about is usually the most useful thing to tell us."
          >
            <textarea
              id="message"
              name="message"
              rows={4}
              maxLength={4000}
              defaultValue={value("message")}
              className={`${inputClasses} min-h-28 resize-y`}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={describedBy("message", true, Boolean(errors.message))}
            />
          </Field>

          {turnstileSiteKey ? (
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-size="flexible" />
          ) : null}
        </Step>

        {state.formError ? (
          <div
            role="alert"
            data-form-error
            className="rounded-md border border-critical bg-critical-soft p-4 text-small text-ink"
          >
            <p className="font-medium">{state.formError}</p>
            {state.persistenceFailed ? (
              /*
                CLAUDE.md: a lead must never silently disappear, and a persistence
                failure owes the customer a real error plus a direct contact
                route. The previous version said "please contact us directly"
                while the site had no published phone or inbox, which is an
                instruction to do something impossible - the worst possible copy
                on the worst possible screen. What it says now depends on what
                actually exists.
              */
              <div className="mt-2 flex flex-col gap-2 text-ink-muted">
                {phone || email ? (
                  <p>
                    Please reach us directly so this doesn&apos;t get lost
                    {phone ? (
                      <>
                        {" "}
                        on{" "}
                        <a
                          href={`tel:${phone}`}
                          className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                        >
                          {phoneDisplay ?? phone}
                        </a>
                      </>
                    ) : null}
                    {phone && email ? " or" : null}
                    {email ? (
                      <>
                        {" "}
                        at{" "}
                        <a
                          href={`mailto:${email}`}
                          className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                        >
                          {email}
                        </a>
                      </>
                    ) : null}
                    .
                  </p>
                ) : (
                  <p>
                    Your answers are still on this page, so pressing send again in
                    a moment is the fastest fix. The failure has been recorded and
                    someone is alerted to it.
                  </p>
                )}
                {state.incidentId ? (
                  <p className="text-micro">
                    Incident reference{" "}
                    <code data-numeric className="font-mono text-ink">
                      {state.incidentId}
                    </code>
                    . Quoting it lets us find exactly what failed.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Wizard navigation. Hidden entirely until JavaScript marks the form as
            enhanced, so a no-JS visitor never sees a button that cannot work. */}
        <div className="planner-nav items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(Math.max(step - 1, 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          {/*
            The keys are load-bearing, not decoration.

            Without them React reconciles these two branches onto the SAME <button>
            node, because they sit at the same position in the tree. Clicking
            "Continue" on step 4 then flips that very node from type="button" to
            type="submit" while the click is still in flight, and the browser
            performs the submit as the click's default action. The result was a
            spurious submission on every run of the last step transition, whose
            re-render wiped the contact fields the customer was about to fill in.

            Distinct keys make React mount a new node instead of mutating the one
            being clicked.
          */}
          {step < FINAL_STEP ? (
            <Button key="planner-continue" type="button" onClick={next} size="lg">
              Continue
            </Button>
          ) : (
            <Button key="planner-submit" type="submit" size="lg" disabled={pending}>
              {pending ? "Sending…" : "Send my inquiry"}
            </Button>
          )}
        </div>

        {/* The single submit for the no-JS path, and the reassurance line that
            belongs next to it either way. */}
        <div className="planner-submit flex-col gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Sending…" : "Send my inquiry"}
          </Button>
          <p className="text-small text-ink-muted">
            A real reply within {slaHours} hours — not an autoresponder. We never
            add you to a drip sequence.
          </p>
        </div>
      </form>
    </>
  );
}

/** One step. Always rendered; visibility is applied by the client on mount. */
function Step({
  step,
  legend,
  children,
}: {
  step: number;
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset data-planner-step={step} className="flex flex-col gap-5 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <h2
        tabIndex={-1}
        className="text-heading-1 font-display text-ink outline-none"
      >
        {legend}
      </h2>
      {children}
    </fieldset>
  );
}

function Progress({ step }: { step: number }) {
  const total = PLANNER_STEPS.length;
  return (
    <div className="planner-progress flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">
          Step {step} of {total}
        </span>
        <span className="text-micro text-ink-subtle">About 90 seconds</span>
      </div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${step} of ${total}`}
      >
        {PLANNER_STEPS.map((s) => (
          <span
            key={s.step}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              s.step <= step ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The receipt replaces the whole planner, intro heading included, so it carries
 * the page's h1 rather than an h2. A document whose only heading vanished on
 * submit would leave a screen reader with nothing to orient against.
 */
function Receipt({ reference, slaHours }: { reference?: string; slaHours: number }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-5 rounded-xl border border-line bg-paper-raised p-6"
    >
      <span className="eyebrow text-positive">Inquiry received</span>
      <h1 className="text-heading-1 font-display text-ink">
        We have it. Here&apos;s what happens next.
      </h1>
      {reference ? (
        <p className="text-small text-ink-muted">
          Your reference is{" "}
          <code className="font-mono font-semibold text-ink">{reference}</code>.
          Quote it if you call.
        </p>
      ) : null}
      <ol className="flex flex-col gap-3 text-small text-ink-muted">
        <ReceiptStep n={1}>
          A real person reads it — within {slaHours} hours, tracked against a
          deadline internally.
        </ReceiptStep>
        <ReceiptStep n={2}>
          You get a straight answer: what we&apos;d do, roughly what it takes,
          and whether we&apos;re the right fit.
        </ReceiptStep>
        <ReceiptStep n={3}>
          If we&apos;re not, we say so and point you somewhere better. That
          costs us bookings and is the point.
        </ReceiptStep>
      </ol>
    </div>
  );
}

function ReceiptStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-soft text-micro font-semibold text-sage"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
