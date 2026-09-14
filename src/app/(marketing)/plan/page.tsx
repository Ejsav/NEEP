import type { Metadata } from "next";
import Script from "next/script";
import { issueFormToken } from "@/lib/security/form-token";
import { turnstileSiteKey } from "@/lib/security/turnstile";
import { responseSlaHours } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { getActiveDraft } from "@/lib/inquiries/drafts";
import { PlannerForm } from "./planner-form";
import { DRAFT_SCOPE, FORM_SCOPE, type PlannerDefaults } from "./form-state";

export const metadata: Metadata = {
  title: "Plan your Connecticut event",
  description:
    "Tell us what you're planning and we'll come back with a real answer, not a brochure. Connecticut weddings, corporate events, private events, and venue and vendor coordination.",
  alternates: { canonical: "/plan" },
  openGraph: {
    url: "/plan",
    title: `Plan your Connecticut event | ${siteConfig.name}`,
    description:
      "Tell us what you're planning and we'll come back with a real answer, not a brochure.",
  },
};

/**
 * Form tokens are minted per render and are short-lived, and the draft is read
 * from a per-visitor cookie. Neither survives caching, and this is the money
 * path, so correctness beats a cache hit.
 */
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const slaHours = responseSlaHours();
  const siteKey = turnstileSiteKey();

  // A returning visitor picks up where they left off. Contact fields are never
  // restored because they were never stored - see src/lib/inquiries/drafts.ts.
  const draft = await getActiveDraft();
  const defaults: PlannerDefaults = draft
    ? {
        eventType: draft.eventType ?? undefined,
        eventDate: draft.eventDate ?? undefined,
        eventDateFlexible: draft.eventDateFlexible,
        guestCountMin: draft.guestCountMin?.toString(),
        guestCountMax: draft.guestCountMax?.toString(),
        eventTown: draft.eventTown ?? undefined,
        venueStatus: draft.venueStatus ?? undefined,
        venueName: draft.venueName ?? undefined,
        scopeTier: draft.scopeTier ?? undefined,
        budgetBand: draft.budgetBand ?? undefined,
        servicesNeeded: draft.servicesNeeded,
        resumeStep: Math.min(draft.furthestStep, 5),
      }
    : {};

  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="flex flex-col gap-10">
          <header className="flex max-w-measure flex-col gap-4">
            <span className="eyebrow">Start here</span>
            <h1 className="text-display-2 font-display text-ink">
              Tell us what you&apos;re planning.
            </h1>
            <p className="text-body-lg text-ink-muted">
              Five short questions, about ninety seconds. The more you tell us,
              the more useful our first reply is — and the less of your time we
              waste asking things you&apos;ve already answered.
            </p>
          </header>

          <PlannerForm
            formToken={issueFormToken(FORM_SCOPE)}
            draftToken={issueFormToken(DRAFT_SCOPE)}
            slaHours={slaHours}
            defaults={defaults}
            turnstileSiteKey={siteKey}
          />
        </div>

        {/*
          Trust rail. Every claim here is a commitment the system actually
          enforces or a fact about how we operate. Nothing on this page claims a
          past customer, a review, or a completed event, because there are none
          yet. See docs/TRUST_STRATEGY.md.
        */}
        <aside className="flex h-fit flex-col gap-6 rounded-xl border border-line bg-paper-raised p-6 lg:sticky lg:top-8">
          <div className="flex flex-col gap-2">
            <span className="eyebrow text-ink-subtle">Our commitment</span>
            <p className="font-display text-heading-2 text-ink">
              A real reply within {slaHours} hours.
            </p>
            <p className="text-small text-ink-muted">
              Not an autoresponder. Every inquiry is tracked against that
              deadline internally, and anything past due is flagged.
            </p>
          </div>

          <dl className="flex flex-col gap-5 border-t border-line pt-5">
            <TrustItem term="You will not be added to a drip sequence.">
              We reply to you personally. If we&apos;re not the right fit,
              we&apos;ll tell you and point you somewhere better.
            </TrustItem>
            <TrustItem term="We coordinate, we don't resell.">
              We handle the venue and vendor side for you. Where an event needs
              transportation, we arrange it through independent licensed and
              insured carriers — we don&apos;t own vehicles or employ drivers.
            </TrustItem>
            <TrustItem term="Connecticut only, for now.">
              We work in Connecticut. If your event is elsewhere in New England,
              say so and we&apos;ll be straight with you about whether we can
              help.
            </TrustItem>
            <TrustItem term="We save your answers as you go.">
              So a dropped connection doesn&apos;t cost you the form. We hold on
              to what the event needs — never your name, email or phone, until
              you actually send it.
            </TrustItem>
          </dl>
        </aside>
      </div>

      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      ) : null}
    </div>
  );
}

function TrustItem({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small font-semibold text-ink">{term}</dt>
      <dd className="text-small text-ink-muted">{children}</dd>
    </div>
  );
}
