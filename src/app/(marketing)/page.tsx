import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { StickyCta } from "@/components/site/sticky-cta";
import { SlotImage } from "@/components/site/slot-image";
import { SectionHeader } from "@/components/sections/section-header";
import { Fact, FactList } from "@/components/sections/fact-list";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
import { responseSlaHours } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { VERTICALS } from "@/lib/domain/verticals";

export const metadata: Metadata = {
  // `absolute` because the root layout applies a `%s | brand` template. Without
  // it a title that already names the brand gets it appended a second time.
  title: {
    absolute: `Connecticut Event Planning | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  alternates: { canonical: "/" },
};

/**
 * Homepage.
 *
 * Every section here either explains, proves, reassures, or asks for the next
 * step. What is deliberately absent is as considered as what is present: no
 * logo wall, no counter, no testimonial strip, no "trusted by". This company
 * has no customers yet, and a visitor can tell the difference between an empty
 * page and a dishonest one. See docs/TRUST_STRATEGY.md.
 *
 * Structured data is Organization only: no publishable street address means no
 * LocalBusiness, and with zero reviews there is no compliant construction of
 * AggregateRating. See docs/DECISIONS.md D-012.
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
    ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
    ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* ------------------------------------------------------------- Hero */}
      {/*
        An editorial masthead rather than a centred stack: the headline runs
        wide, a rule closes it, and the two things a visitor needs next sit
        underneath in their own columns - the argument on the left, the facts on
        the right. Every line in the fact list is a verifiable statement about
        how the company operates, never a claim about work it has not done.
      */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-20">
          <span className="eyebrow">{siteConfig.serviceArea.description}</span>
          <h1 className="mt-5 max-w-[19ch] text-display-1 font-display text-ink">
            Tell us what you want. We make it happen.
          </h1>

          <div className="mt-10 grid gap-10 border-t border-line pt-8 sm:mt-12 sm:pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="flex max-w-measure flex-col gap-6">
              <p className="text-body-lg text-ink-muted">
                You have a date, a budget and an idea of how it should feel. We
                turn that into an event: the venue, the vendors, the timeline,
                the people, and the hundred decisions underneath. You approve;
                we carry it.
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/plan" size="lg">
                  Start planning
                </ButtonLink>
                <p className="text-small text-ink-muted">
                  Five questions, about ninety seconds.
                </p>
              </div>
            </div>

            <FactList>
              <Fact term="Where">
                {siteConfig.serviceArea.state}. Nowhere else, yet — and we will
                say so rather than take the booking.
              </Fact>
              <Fact term="What">
                Weddings, corporate events and launches, private and social
                events, or coordination on its own when you have the vendors
                already.
              </Fact>
              <Fact term="Reply">
                Within {slaHours} hours, written by a person who read what you
                sent.
              </Fact>
            </FactList>
          </div>
        </div>

        {/*
          The image sits BELOW the hero copy, not behind it. Text over
          photography costs contrast and forces a scrim; text first also means
          the largest paint is a heading the browser already has, which is what
          holds LCP under budget while still letting a full-bleed image do the
          emotional work.
        */}
        <SlotImage
          name="hero-home"
          priority
          sizes="100vw"
          className="h-[46vh] max-h-[34rem] w-full object-cover sm:h-[52vh]"
        />
      </section>

      {/* --------------------------------------------------- The four things */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="Four things, done properly."
            lede="We do not do everything. These are the four we do, and the list is not going to grow to win a booking."
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {VERTICALS.map((vertical, index) => (
              <Reveal
                as="li"
                key={vertical.slug}
                delayMs={index * 60}
                className="group"
              >
                <Link
                  href={`/${vertical.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-line bg-paper-raised p-6 transition duration-150 ease-out-quiet hover:-translate-y-px hover:border-line-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <h3 className="font-display text-heading-2 text-ink">
                    {vertical.title}
                  </h3>
                  <p className="text-small text-ink-muted">{vertical.homeBlurb}</p>
                  <span className="mt-auto pt-3 text-small font-medium text-ink group-hover:text-accent">
                    {vertical.homeLink} &rarr;
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="How it works."
            lede="Three steps. No discovery call you have to sit through before anyone tells you anything useful."
          />

          <div className="mt-10 sm:mt-12">
            <RuledList as="ol" columns={3}>
              <RuledItem as="li" index="01" heading="Tell us what you're planning">
                Five short questions. Event type, date, guest count, where you
                are with a venue, and what you want us to run. We save your
                answers as you go.
              </RuledItem>
              <RuledItem as="li" index="02" heading="We come back with a real answer" delayMs={60}>
                Within {slaHours} hours: what we&apos;d do, roughly what it
                takes, and the questions we&apos;d need answered next. Written
                by a person who read your form.
              </RuledItem>
              <RuledItem as="li" index="03" heading="We say if we're not a fit" delayMs={120}>
                If your event is outside Connecticut, outside these four
                categories, or beyond what we can do well, we tell you and point
                you elsewhere. That costs us bookings and it is the point.
              </RuledItem>
            </RuledList>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- What zero looks like */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-display-2 font-display text-ink">
                We are new. Here is exactly how new.
              </h2>
              <p className="text-body-lg text-ink-muted">
                No completed events. No reviews. No case studies. No awards. You
                will not find a wall of logos here, because there is nothing
                honest to put on it.
              </p>
              <p className="text-body text-ink-muted">
                What you get instead is a published process, a response
                commitment the system actually enforces, and someone who will
                tell you when the answer is no. When there is real proof, it
                will appear here — with names attached.
              </p>
              <p className="text-body text-ink-muted">
                <Link
                  href="/about"
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  The longer version
                </Link>{" "}
                says what the company is, how it is paid, and the two things it
                will not do.
              </p>
            </Reveal>

            <Reveal className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
              <h3 className="font-display text-heading-2 text-ink">
                What we will not do
              </h3>
              <ul className="flex flex-col gap-3 text-small text-ink-muted">
                <Wont>Invent a review, a past event, or a happy client.</Wont>
                <Wont>
                  Put you in an automated email sequence because you filled in a
                  form.
                </Wont>
                <Wont>
                  Quote a price before we understand what you are actually
                  asking for.
                </Wont>
                <Wont>
                  Take an event we cannot run well just because it is revenue.
                </Wont>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Closing CTA */}
      {/*
        The heading and the action sit on one line at desktop width rather than
        stacking down the left edge: the visitor has reached the bottom having
        already read the argument, so this is a door, not another pitch.
      */}
      <section>
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <Reveal className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
            <div className="flex max-w-measure flex-col gap-4">
              <h2 className="text-display-2 font-display text-ink">
                Start with the part you are dreading.
              </h2>
              <p className="text-body-lg text-ink-muted">
                You do not need a finished plan to get a useful answer. A date, a
                rough guest count, and the part you are dreading is enough.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:pb-1.5">
              <ButtonLink href="/plan" size="lg">
                Start planning
              </ButtonLink>
              {siteConfig.contact.phone ? (
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="text-small font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent hover:decoration-accent"
                >
                  Or call {siteConfig.contact.phoneDisplay ?? siteConfig.contact.phone}
                </a>
              ) : (
                <p className="text-small text-ink-muted">
                  Prefer to write instead?{" "}
                  <Link
                    href="/contact"
                    className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                  >
                    Contact us directly
                  </Link>
                  .
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <StickyCta />
    </>
  );
}

function Wont({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-line-strong" />
      <span>{children}</span>
    </li>
  );
}
