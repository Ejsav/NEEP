"use client";

import { useActionState, useId, useState } from "react";
import {
  BUDGET_BANDS,
  CONTACT_PREFERENCES,
  EVENT_TYPES,
  SERVICE_OPTIONS,
  VENUE_STATUSES,
  type EventTypeValue,
} from "@/lib/domain/inquiry-options";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  describedBy,
  inputClasses,
} from "@/components/ui/field";
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/security/form-fields";
import { submitInquiry } from "./actions";
import { initialInquiryState, type InquiryFormState } from "./form-state";
import { siteConfig } from "@/lib/site-config";

/**
 * The inquiry form.
 *
 * Progressive enhancement: this posts to a Server Action, so it submits and
 * re-renders its errors with JavaScript disabled. Everything JS adds here is an
 * enhancement over a form that already works.
 *
 * Service filtering by event type is one such enhancement. Before a type is
 * chosen - which is also the no-JS state - every option renders, so nothing is
 * unreachable without scripting.
 */

type Props = { formToken: string };

function str(values: InquiryFormState["values"], key: string): string {
  const value = values?.[key];
  if (typeof value === "string") return value;
  return "";
}

function arr(values: InquiryFormState["values"], key: string): string[] {
  const value = values?.[key];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

export function InquiryForm({ formToken }: Props) {
  const [state, formAction, pending] = useActionState(
    submitInquiry,
    initialInquiryState,
  );
  const [eventType, setEventType] = useState<EventTypeValue | "">("");
  const headingId = useId();

  if (state.status === "success") {
    return <SubmissionReceipt state={state} />;
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values;

  // No selection (also the no-JS state) shows everything.
  const visibleServices =
    eventType === ""
      ? SERVICE_OPTIONS
      : SERVICE_OPTIONS.filter((s) => s.appliesTo.includes(eventType));

  return (
    <form action={formAction} noValidate className="flex flex-col gap-10">
      <input type="hidden" name={FORM_TOKEN_FIELD} value={formToken} />

      {/* Honeypot. Hidden from sight, from screen readers, and from tab order. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        style={{ left: "-9999px", top: "-9999px" }}
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

      {state.formError ? (
        <div
          role="alert"
          data-form-error
          className="rounded-lg border border-critical bg-critical-soft p-4 text-small text-ink"
        >
          <p className="font-medium">{state.formError}</p>
          {state.persistenceFailed ? (
            <PersistenceFailureHelp incidentId={state.incidentId} />
          ) : null}
        </div>
      ) : null}

      {/* -------------------------------------------------- 1. What you're planning */}
      <section aria-labelledby={`${headingId}-type`} className="flex flex-col gap-4">
        <SectionHeading id={`${headingId}-type`} step="01">
          What are you planning?
        </SectionHeading>

        <FieldGroup
          name="eventType"
          legend="Event type"
          errors={errors.eventType}
          className="[&>legend]:sr-only"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {EVENT_TYPES.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper-raised p-4 transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
              >
                {/*
                  The native control stays visible rather than being hidden
                  behind a styled proxy. It keeps its own state indicator, which
                  is what survives Windows High Contrast / forced-colors mode,
                  and it stays directly clickable.
                */}
                <input
                  type="radio"
                  name="eventType"
                  value={option.value}
                  defaultChecked={str(values, "eventType") === option.value}
                  onChange={() => setEventType(option.value)}
                  aria-describedby={describedBy(
                    "eventType",
                    false,
                    Boolean(errors.eventType),
                  )}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-small font-medium text-ink">
                    {option.label}
                  </span>
                  <span className="text-micro text-ink-muted">{option.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </FieldGroup>
      </section>

      {/* ------------------------------------------------------------ 2. Contact */}
      <section aria-labelledby={`${headingId}-contact`} className="flex flex-col gap-4">
        <SectionHeading id={`${headingId}-contact`} step="02">
          How do we reach you?
        </SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" label="First name" required errors={errors.firstName}>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              maxLength={80}
              defaultValue={str(values, "firstName")}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={describedBy("firstName", false, Boolean(errors.firstName))}
              className={inputClasses}
            />
          </Field>

          <Field name="lastName" label="Last name" required errors={errors.lastName}>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              maxLength={80}
              defaultValue={str(values, "lastName")}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={describedBy("lastName", false, Boolean(errors.lastName))}
              className={inputClasses}
            />
          </Field>

          <Field name="email" label="Email" required errors={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              defaultValue={str(values, "email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email", false, Boolean(errors.email))}
              className={inputClasses}
            />
          </Field>

          <Field
            name="phone"
            label="Phone"
            hint="Faster for anything time-sensitive."
            errors={errors.phone}
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              defaultValue={str(values, "phone")}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy("phone", true, Boolean(errors.phone))}
              className={inputClasses}
            />
          </Field>
        </div>

        <FieldGroup
          name="contactPreference"
          legend="How would you rather we get back to you?"
          errors={errors.contactPreference}
        >
          <div className="flex flex-wrap gap-2">
            {CONTACT_PREFERENCES.map((option, index) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value={option.value}
                  defaultChecked={
                    str(values, "contactPreference")
                      ? str(values, "contactPreference") === option.value
                      : index === CONTACT_PREFERENCES.length - 1
                  }
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                {option.label}
              </label>
            ))}
          </div>
        </FieldGroup>
      </section>

      {/* -------------------------------------------------------------- 3. Event */}
      <section aria-labelledby={`${headingId}-event`} className="flex flex-col gap-4">
        <SectionHeading id={`${headingId}-event`} step="03">
          The event itself
        </SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="eventDate"
            label="Event date"
            hint="Or tick the box below if you're still deciding."
            errors={errors.eventDate}
          >
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              defaultValue={str(values, "eventDate")}
              aria-invalid={Boolean(errors.eventDate)}
              aria-describedby={describedBy("eventDate", true, Boolean(errors.eventDate))}
              className={inputClasses}
            />
          </Field>

          <div className="flex items-end pb-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-small text-ink">
              <input
                type="checkbox"
                name="eventDateFlexible"
                defaultChecked={str(values, "eventDateFlexible") === "on"}
                className="h-5 w-5 shrink-0 rounded-sm accent-accent"
              />
              My date is still flexible
            </label>
          </div>

          <Field
            name="guestCountMin"
            label="Guests (low estimate)"
            errors={errors.guestCountMin}
          >
            <input
              id="guestCountMin"
              name="guestCountMin"
              type="number"
              inputMode="numeric"
              min={1}
              max={20000}
              defaultValue={str(values, "guestCountMin")}
              aria-invalid={Boolean(errors.guestCountMin)}
              aria-describedby={describedBy(
                "guestCountMin",
                false,
                Boolean(errors.guestCountMin),
              )}
              className={inputClasses}
            />
          </Field>

          <Field
            name="guestCountMax"
            label="Guests (high estimate)"
            errors={errors.guestCountMax}
          >
            <input
              id="guestCountMax"
              name="guestCountMax"
              type="number"
              inputMode="numeric"
              min={1}
              max={20000}
              defaultValue={str(values, "guestCountMax")}
              aria-invalid={Boolean(errors.guestCountMax)}
              aria-describedby={describedBy(
                "guestCountMax",
                false,
                Boolean(errors.guestCountMax),
              )}
              className={inputClasses}
            />
          </Field>

          <Field name="eventTown" label="Town or area" errors={errors.eventTown}>
            <input
              id="eventTown"
              name="eventTown"
              type="text"
              maxLength={80}
              placeholder="Mystic, Litchfield, Greenwich..."
              defaultValue={str(values, "eventTown")}
              aria-invalid={Boolean(errors.eventTown)}
              aria-describedby={describedBy("eventTown", false, Boolean(errors.eventTown))}
              className={inputClasses}
            />
          </Field>

          <Field name="budgetBand" label="Total event budget" errors={errors.budgetBand}>
            <select
              id="budgetBand"
              name="budgetBand"
              defaultValue={str(values, "budgetBand")}
              aria-invalid={Boolean(errors.budgetBand)}
              aria-describedby={describedBy("budgetBand", false, Boolean(errors.budgetBand))}
              className={inputClasses}
            >
              <option value="">Select a range</option>
              {BUDGET_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
          </Field>

          <Field name="venueStatus" label="Where are you with a venue?" errors={errors.venueStatus}>
            <select
              id="venueStatus"
              name="venueStatus"
              defaultValue={str(values, "venueStatus")}
              aria-invalid={Boolean(errors.venueStatus)}
              aria-describedby={describedBy("venueStatus", false, Boolean(errors.venueStatus))}
              className={inputClasses}
            >
              <option value="">Select one</option>
              {VENUE_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>

          <Field name="venueName" label="Venue name" errors={errors.venueName}>
            <input
              id="venueName"
              name="venueName"
              type="text"
              maxLength={160}
              placeholder="If you have one in mind"
              defaultValue={str(values, "venueName")}
              aria-invalid={Boolean(errors.venueName)}
              aria-describedby={describedBy("venueName", false, Boolean(errors.venueName))}
              className={inputClasses}
            />
          </Field>
        </div>
      </section>

      {/* ----------------------------------------------------------- 4. Services */}
      <section aria-labelledby={`${headingId}-services`} className="flex flex-col gap-4">
        <SectionHeading id={`${headingId}-services`} step="04">
          What do you want handled?
        </SectionHeading>

        <FieldGroup
          name="servicesNeeded"
          legend="Services"
          hint="Pick as many as apply. Not sure is a valid answer."
          errors={errors.servicesNeeded}
          className="[&>legend]:sr-only"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleServices.map((service) => (
              <label
                key={service.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-paper-raised p-3 text-small transition duration-150 ease-out-quiet hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
              >
                <input
                  type="checkbox"
                  name="servicesNeeded"
                  value={service.value}
                  defaultChecked={arr(values, "servicesNeeded").includes(service.value)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-sm accent-accent"
                />
                <span className="text-ink">{service.label}</span>
              </label>
            ))}
          </div>
        </FieldGroup>

        <Field
          name="message"
          label="Anything else we should know?"
          hint="The more context you give us, the more useful our first reply is."
          errors={errors.message}
        >
          <textarea
            id="message"
            name="message"
            rows={5}
            maxLength={4000}
            defaultValue={str(values, "message")}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy("message", true, Boolean(errors.message))}
            className={`${inputClasses} resize-y`}
          />
        </Field>
      </section>

      {/* ------------------------------------------------------------- 5. Submit */}
      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending your inquiry..." : "Send my inquiry"}
        </Button>
        <p className="text-micro text-ink-muted">
          No obligation, no automated sales sequence. We read every inquiry
          ourselves and reply with a real answer.
        </p>
      </div>
    </form>
  );
}

function SectionHeading({
  id,
  step,
  children,
}: {
  id: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line pb-2">
      <span className="eyebrow text-accent" aria-hidden="true">
        {step}
      </span>
      <h2 id={id} className="text-heading-2 font-display text-ink">
        {children}
      </h2>
    </div>
  );
}

/**
 * Shown only when the database write failed. The customer is not left holding a
 * lost inquiry - we hand over whatever direct routes actually exist.
 */
function PersistenceFailureHelp({ incidentId }: { incidentId?: string }) {
  const { email, phone, phoneDisplay } = siteConfig.contact;
  const hasRoute = Boolean(email || phone);

  return (
    <div className="mt-3 flex flex-col gap-2 text-small">
      {hasRoute ? (
        <p>
          Please reach us directly and we&apos;ll pick it up straight away:
          {email ? (
            <>
              {" "}
              <a href={`mailto:${email}`} className="font-medium underline underline-offset-4">
                {email}
              </a>
            </>
          ) : null}
          {email && phone ? " or" : null}
          {phone ? (
            <>
              {" "}
              <a href={`tel:${phone}`} className="font-medium underline underline-offset-4">
                {phoneDisplay ?? phone}
              </a>
            </>
          ) : null}
          .
        </p>
      ) : (
        <p>Please try again in a few minutes.</p>
      )}
      {incidentId ? (
        <p className="text-micro text-ink-muted">
          Reference this if you contact us:{" "}
          <code className="font-mono">{incidentId}</code>
        </p>
      ) : null}
    </div>
  );
}

/** Success state. Concrete about what happens next and by when. */
function SubmissionReceipt({ state }: { state: InquiryFormState }) {
  const { email, phone, phoneDisplay } = siteConfig.contact;

  return (
    <div
      className="rise-in flex flex-col gap-6 rounded-xl border border-line-strong bg-paper-raised p-6 sm:p-8"
      role="status"
    >
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-accent">Inquiry received</span>
        <h2 className="text-heading-1 font-display text-ink">
          Thank you. We have it.
        </h2>
      </div>

      {state.reference ? (
        <div className="flex flex-col gap-1 rounded-lg bg-paper-sunk p-4">
          <span className="text-micro text-ink-muted">Your reference</span>
          <span className="font-mono text-heading-2 text-ink" data-numeric>
            {state.reference}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h3 className="text-small font-semibold text-ink">What happens next</h3>
        <ol className="flex flex-col gap-3 text-small text-ink-muted">
          <ReceiptStep n="1">
            A person reads your inquiry. Not a bot, and not a form router.
          </ReceiptStep>
          <ReceiptStep n="2">
            {state.slaHours
              ? `You get a real reply within ${state.slaHours} hours`
              : "You get a real reply"}
            {" — either answers, or the specific questions we need answered to be useful."}
          </ReceiptStep>
          <ReceiptStep n="3">
            If we&apos;re a fit, we book a call. If we&apos;re not, we say so and
            point you somewhere better.
          </ReceiptStep>
        </ol>
      </div>

      {email || phone ? (
        <p className="border-t border-line pt-4 text-micro text-ink-muted">
          Need us sooner?{" "}
          {phone ? (
            <a href={`tel:${phone}`} className="underline underline-offset-4">
              {phoneDisplay ?? phone}
            </a>
          ) : null}
          {phone && email ? " or " : null}
          {email ? (
            <a href={`mailto:${email}`} className="underline underline-offset-4">
              {email}
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function ReceiptStep({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-micro font-semibold text-accent"
        aria-hidden="true"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
