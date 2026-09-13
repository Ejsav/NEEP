import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { responseSlaHours } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { EVENT_TYPES } from "@/lib/domain/inquiry-options";

export const metadata: Metadata = {
  // `absolute` because the root layout applies a `%s | brand` template. Without
  // it a title that already names the brand gets it appended a second time,
  // which produced a 99-character title Google would truncate.
  title: {
    absolute: `Connecticut Event Planning | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  alternates: { canonical: "/" },
};

/**
 * Homepage.
 *
 * Deliberately narrow for launch. It exists to explain what the company does
 * and route to the inquiry form. It makes no claim about past events, reviews,
 * customers, awards or partnerships, because there are none yet - and an honest
 * empty state converts better than an obvious lie. See docs/TRUST_STRATEGY.md.
 *
 * Structured data is Organization only: no publishable street address means no
 * LocalBusiness, and with zero reviews there is no compliant construction of
 * AggregateRating. See docs/SEO_STRATEGY.md.
 */
export default function HomePage() {
  const slaHours = responseSlaHours();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    description: siteConfig.tagline,
    areaServed: {
      "@type": "State",
      name: siteConfig.serviceArea.state,
    },
    ...(siteConfig.contact.email
      ? { email: siteConfig.contact.email }
      : {}),
    ...(siteConfig.contact.phone
      ? { telephone: siteConfig.contact.phone }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* ------------------------------------------------------------- Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex max-w-3xl flex-col gap-6">
            <span className="eyebrow">
              {siteConfig.serviceArea.description}
            </span>
            <h1 className="text-display-1 font-display text-ink">
              Planning an event shouldn&apos;t mean managing twelve strangers.
            </h1>
            <p className="max-w-measure text-body-lg text-ink-muted">
              {siteConfig.name} is one place to start. We find the venue, source
              and vet the vendors, hold the timeline, and run the logistics —
              so you make decisions instead of chasing quotes.
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/start" size="lg">
                Start planning
              </ButtonLink>
              <p className="text-small text-ink-muted">
                A real reply within {slaHours} hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- What we do */}
      <section
        aria-labelledby="what-we-do"
        className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="flex flex-col gap-3">
          <span className="eyebrow text-ink-subtle">What we do</span>
          <h2 id="what-we-do" className="max-w-measure text-display-2 font-display text-ink">
            Four kinds of event. One point of contact.
          </h2>
        </div>

        <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          {EVENT_TYPES.map((type) => (
            <li key={type.value} className="bg-paper-raised p-6 sm:p-8">
              <h3 className="font-display text-heading-2 text-ink">
                {type.label}
              </h3>
              <p className="mt-2 text-small text-ink-muted">{type.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- How it works */}
      <section
        aria-labelledby="how-it-works"
        className="border-y border-line bg-paper-sunk"
      >
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col gap-3">
            <span className="eyebrow text-ink-subtle">How it works</span>
            <h2
              id="how-it-works"
              className="max-w-measure text-display-2 font-display text-ink"
            >
              What actually happens after you hit send.
            </h2>
            <p className="max-w-measure text-body-lg text-ink-muted">
              We&apos;re new. We don&apos;t have a wall of reviews to point at
              yet, so instead here is exactly how we work — and you can hold us
              to it.
            </p>
          </div>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            <Step n="01" title={`We read it within ${slaHours} hours`}>
              A person, not a router. Every inquiry gets a response deadline
              the moment it lands, and anything past due gets flagged
              internally.
            </Step>
            <Step n="02" title="We come back with specifics">
              Either real answers to what you asked, or the exact questions we
              need answered to be useful. Never a brochure.
            </Step>
            <Step n="03" title="We tell you if we're not a fit">
              If your event is outside what we can do well, we say so and point
              you somewhere better. That costs us a booking and saves you a
              month.
            </Step>
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------- Honest positioning */}
      <section
        aria-labelledby="how-we-work"
        className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-3">
            <span className="eyebrow text-ink-subtle">How we work</span>
            <h2
              id="how-we-work"
              className="text-display-2 font-display text-ink"
            >
              We coordinate. We don&apos;t pretend to be everyone.
            </h2>
          </div>

          <div className="flex flex-col gap-6 text-body text-ink-muted">
            <p>
              We own the relationship with you and the coordination of your
              event. The work itself — catering, florals, photography, rentals,
              production, transportation — is delivered by independent providers
              we source and vet on your behalf.
            </p>
            <p>
              That includes transportation. We do not own vehicles or employ
              drivers. When your event needs a shuttle run or guest transport,
              we specify it, source it from licensed and insured carriers, and
              hold the schedule — and your transportation contract is with the
              carrier, not with us.
            </p>
            <p>
              We work in {siteConfig.serviceArea.description}. That&apos;s where
              we know the venues, the towns, the vendors and the constraints. If
              you&apos;re planning elsewhere in New England, ask — we&apos;ll
              tell you honestly whether we can help.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <section className="border-t border-line bg-paper-sunk">
        <div className="mx-auto flex max-w-content flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="max-w-measure text-display-2 font-display text-ink">
            Tell us what you&apos;re planning.
          </h2>
          <p className="max-w-measure text-body-lg text-ink-muted">
            Three minutes now saves you a month of chasing quotes. No obligation,
            and no sales sequence afterwards.
          </p>
          <ButtonLink href="/start" size="lg">
            Start planning
          </ButtonLink>
          <p className="text-small text-ink-muted">
            Prefer to look around first?{" "}
            <Link
              href="/start"
              className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
            >
              The form tells you what we&apos;d need to know anyway.
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 border-t-2 border-sage pt-4">
      <span className="eyebrow text-sage" aria-hidden="true">
        {n}
      </span>
      <h3 className="font-display text-heading-2 text-ink">{title}</h3>
      <p className="text-small text-ink-muted">{children}</p>
    </li>
  );
}
