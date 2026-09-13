import type { Metadata } from "next";
import { issueFormToken } from "@/lib/security/form-token";
import { responseSlaHours } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { InquiryForm } from "./inquiry-form";
import { FORM_SCOPE } from "./form-state";

export const metadata: Metadata = {
  title: "Plan your Connecticut event",
  description:
    "Tell us what you're planning and we'll come back with a real answer, not a brochure. Connecticut weddings, corporate events, private events, and venue and vendor coordination.",
  alternates: { canonical: "/start" },
  openGraph: {
    url: "/start",
    title: `Start planning your Connecticut event | ${siteConfig.name}`,
    description:
      "Tell us what you're planning and we'll come back with a real answer, not a brochure.",
  },
};

/**
 * The form token is minted per render and is short-lived, so this route must
 * never be statically cached. It is the money path; correctness beats a cache
 * hit here.
 */
export const dynamic = "force-dynamic";

export default function StartPage() {
  const formToken = issueFormToken(FORM_SCOPE);
  const slaHours = responseSlaHours();

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
              This takes about three minutes. The more you tell us, the more
              useful our first reply is — and the less of your time we waste
              asking questions you&apos;ve already answered.
            </p>
          </header>

          <InquiryForm formToken={formToken} />
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
          </dl>
        </aside>
      </div>
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
