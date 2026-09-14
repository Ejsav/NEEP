import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Prose } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { SectionHeader } from "@/components/sections/section-header";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
import { responseSlaHours, siteUrl } from "@/lib/env";
import { BANDS, COST_DRIVERS, pricingIsPublished } from "@/lib/domain/pricing";

export const metadata: Metadata = {
  title: "What events cost",
  description:
    "What actually drives the cost of a Connecticut event: guest count thresholds, season, venue type, vendor policy, scope and access. Written plainly, with no invented figures.",
  alternates: { canonical: "/pricing" },
};

/**
 * Pricing.
 *
 * The page ships before the numbers do, because the cost-driver content is
 * genuinely useful on its own and is honest without them. When the business
 * supplies a real fee structure, filling BANDS in lib/domain/pricing.ts turns
 * the table on. No market-derived placeholder ever renders. See D-018.
 */
export default function PricingPage() {
  const slaHours = responseSlaHours();
  const base = siteUrl();
  const published = pricingIsPublished();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Pricing", item: `${base}/pricing` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHeader
        eyebrow="Investment"
        title="What an event actually costs, and why."
        standfirst="Most of what decides your budget has nothing to do with which planner you hire. Here is what genuinely moves the number, so you can judge any quote you are given — including ours."
        crumb={{ href: "/pricing", label: "Pricing" }}
        aside={
          published ? undefined : (
            /*
             * The honest empty state, promoted to the masthead. On the one page
             * where "we have not set a price yet" is the single most important
             * fact, burying it in a band below the fold would be a design
             * decision that quietly undoes an editorial one.
             */
            <div className="flex h-fit flex-col gap-3 rounded-xl border border-line bg-paper-raised p-6">
              <h2 className="font-display text-heading-2 text-ink">
                We have not published our fees yet.
              </h2>
              <p className="text-small text-ink-muted">
                We would rather say that than print a range we cannot stand
                behind. Publishing other companies&apos; numbers as though they
                were ours would be the easiest thing on this page to do and the
                least honest.
              </p>
              <p className="text-small text-ink-muted">
                Ask, and you get a real figure for your actual event — scope,
                date and guest count included — within {slaHours} hours. No call
                required first, and no obligation attached to it.
              </p>
              <div className="mt-1">
                <ButtonLink href="/plan" variant="secondary">
                  Get a real number
                </ButtonLink>
              </div>
            </div>
          )
        }
      />

      {published ? (
        <section className="border-b border-line bg-paper-sunk">
          <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
            <SectionHeader
              title="Our fees"
              lede="What each level of involvement costs, and what it does and does not cover."
            />
            <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
              {BANDS.map((band) => (
                <div
                  key={band.name}
                  className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-6"
                >
                  <h3 className="font-display text-heading-2 text-ink">
                    {band.name}
                  </h3>
                  <p className="text-body-lg font-medium text-ink" data-numeric>
                    {band.range}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-small text-ink-muted">
                    {band.includes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {band.excludes.length > 0 ? (
                    <p className="border-t border-line pt-3 text-micro text-ink-subtle">
                      Not included: {band.excludes.join("; ")}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        <SectionHeader
          title="What moves the number"
          lede="Most of the spread between two events that look identical on paper comes from a handful of variables. These are them."
        />
        <div className="mt-10 sm:mt-12">
          <RuledList>
            {COST_DRIVERS.map((driver, index) => (
              <RuledItem
                key={driver.heading}
                heading={driver.heading}
                delayMs={index * 50}
              >
                {driver.body}
              </RuledItem>
            ))}
          </RuledList>
        </div>
      </div>

      <Prose>
        <h2>What the planner asks about budget, and why</h2>
        <p>
          The planner asks for a band rather than a number, and it asks about{" "}
          <strong>your budget for the whole event</strong> — not about what you
          expect to pay us. It is there so we can tell you quickly whether what
          you want is achievable at that level, and say so if it is not.
        </p>
        <p>
          It is not a price list, it is not used to work out what to charge you,
          and picking a higher band does not get you a higher quote. If you are
          not sure, there is an option that says so, and choosing it costs you
          nothing.
        </p>
        <p>
          <Link
            href="/how-we-work"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            How we work
          </Link>{" "}
          covers what happens after you send it.
        </p>
      </Prose>

      <StickyCta />
    </>
  );
}
