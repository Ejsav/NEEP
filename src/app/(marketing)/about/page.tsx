import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
import { Fact, FactList } from "@/components/sections/fact-list";
import { siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { VERTICALS } from "@/lib/domain/verticals";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who New England Event Planners is, how the coordinator model actually works, and an honest account of what this company has and has not done yet.",
  alternates: { canonical: "/about" },
};

/**
 * About.
 *
 * NO PERSON IS DEPICTED ON THIS PAGE, and that is deliberate rather than
 * unfinished. A named founder with a real photograph is the single strongest
 * trust substitute available to a company with no reviews - and a stock
 * photograph of a "team" is fabrication. The founder module is built and stays
 * dark until there is a real name, a real photograph and real credentials to
 * put in it. See docs/TRUST_STRATEGY.md.
 *
 * Structured as sections rather than one long prose column. The honesty
 * section is the most valuable thing on the page and it was previously the
 * fourth paragraph of an undifferentiated wall; it now has a band to itself.
 */
export default function AboutPage() {
  const base = siteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "About", item: `${base}/about` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHeader
        eyebrow="About"
        title="A coordinator, not a middleman."
        standfirst="One company holding the customer relationship and the logistics, with the work delivered by independent providers we select and stand behind."
        crumb={{ href: "/about", label: "About" }}
        aside={
          <FactList>
            <Fact term="Entity">{siteConfig.legalName}</Fact>
            <Fact term="Area">
              {siteConfig.serviceArea.state}. The architecture supports the rest
              of New England; the company does not operate there yet.
            </Fact>
            <Fact term="Model">
              We hold the relationship and the logistics. Independent providers
              do the delivery, under contracts you sign.
            </Fact>
          </FactList>
        }
      />

      {/* ------------------------------------------------ What this company is */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="What this company is"
            lede="A Connecticut event services company that owns the customer relationship end to end and coordinates delivery through providers it selects."
          />
          <div className="mt-10 grid gap-10 sm:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <Reveal className="flex max-w-measure flex-col gap-5 text-body text-ink-muted">
              <p>
                {siteConfig.name} owns the relationship with you from the first
                message to the end of the event, and coordinates delivery
                through independent providers — venues, caterers, photographers,
                florists, entertainment, rentals and transportation.
              </p>
              <p>
                The point is that there is one place to start, and one person
                accountable, instead of you separately finding and managing
                every vendor an event turns out to need.
              </p>
            </Reveal>

            {/*
              Deliberately does not describe the fee model. The business has not
              set one that we are in a position to publish, and a sentence like
              "we never take a commission" is a representation the company would
              then be held to - a CUTPA problem, not a copy problem. What this
              card can honestly do is point at the two pages that answer the
              money question as far as it can currently be answered.
            */}
            <Reveal className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
              <h3 className="font-display text-heading-2 text-ink">
                What about money
              </h3>
              <p className="text-small text-ink-muted">
                We have not published a fee schedule, and we would rather say
                that than print a range we cannot stand behind. Ask through the
                planner and you get a real figure for your actual event, with no
                call required first.
              </p>
              <ul className="flex flex-col border-t border-line">
                <li className="border-b border-line">
                  <Link
                    href="/pricing"
                    className="flex items-center justify-between gap-4 py-3 text-small text-ink transition-colors duration-150 hover:text-accent"
                  >
                    What actually drives the cost
                    <span aria-hidden="true" className="text-ink-subtle">
                      &rarr;
                    </span>
                  </Link>
                </li>
                <li className="border-b border-line">
                  <Link
                    href="/how-we-work"
                    className="flex items-center justify-between gap-4 py-3 text-small text-ink transition-colors duration-150 hover:text-accent"
                  >
                    What happens after you ask
                    <span aria-hidden="true" className="text-ink-subtle">
                      &rarr;
                    </span>
                  </Link>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- The honesty */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <Reveal className="flex max-w-measure flex-col gap-5">
              <h2 className="text-display-2 font-display text-ink">
                Where we are, honestly.
              </h2>
              <p className="text-body-lg text-ink-muted">
                This company is new. At the time of writing it has no completed
                events on the books, no reviews, no case studies and no awards.
                You will not find a wall of client logos here, because there is
                nothing truthful to put on it.
              </p>
              <p className="text-body text-ink-muted">
                That is an uncomfortable thing to publish and it is the right
                thing to publish. Every alternative — a stock photograph of a
                &ldquo;team&rdquo;, a borrowed testimonial, a vague claim about
                years of experience — is a lie that a customer would eventually
                catch.
              </p>
              <p className="text-body text-ink-muted">
                When there is real proof, it will appear on this site with names
                attached and permission given. Not before.
              </p>
            </Reveal>

            <Reveal className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
              <h3 className="font-display text-heading-2 text-ink">
                What you get instead
              </h3>
              <ul className="flex flex-col gap-3 text-small text-ink-muted">
                <Instead>
                  A process you can read in full before you speak to anyone.
                </Instead>
                <Instead>
                  A response commitment the system enforces, not a promise in
                  marketing copy.
                </Instead>
                <Instead>
                  A company that will tell you when the answer is no, and point
                  you somewhere better.
                </Instead>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ The four, and the not */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="The four things we do"
            lede="That list is not going to quietly grow in order to win a booking. If what you need is outside it, we will say so."
          />
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:mt-12 sm:grid-cols-2 lg:gap-x-16">
            {VERTICALS.map((vertical, index) => (
              <Reveal
                as="li"
                key={vertical.slug}
                delayMs={index * 60}
                className="border-t-2 border-sage pt-4"
              >
                <Link
                  href={`/${vertical.slug}`}
                  className="group flex flex-col gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                >
                  <h3 className="font-display text-heading-2 text-ink transition-colors duration-150 group-hover:text-accent">
                    {vertical.title}
                  </h3>
                  <p className="text-small text-ink-muted">
                    {vertical.homeBlurb}
                  </p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="What we do not do"
            lede="Two boundaries that are stated here because leaving them to be inferred would be the dishonest option."
          />
          <div className="mt-10 sm:mt-12">
            <RuledList>
              <RuledItem heading="We are not a transportation operator">
                We own no vehicles, employ no drivers, and hold no carrier
                authority. Where an event needs transportation we arrange and
                schedule it through independent licensed and insured carriers,
                and the transportation contract is between you and that carrier.
              </RuledItem>
              <RuledItem heading="We do not work outside Connecticut yet" delayMs={60}>
                The company is built to expand across New England. Until it
                has, we are not going to imply otherwise, and an enquiry from
                outside the state gets an honest answer rather than a maybe.
              </RuledItem>
            </RuledList>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- Entity + closing CTA */}
      <section>
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="flex max-w-measure flex-col gap-4">
              <h2 className="text-display-2 font-display text-ink">
                Talk to a person about it.
              </h2>
              <p className="text-body-lg text-ink-muted">
                The{" "}
                <Link
                  href="/plan"
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  planner
                </Link>{" "}
                is the fastest route to a useful answer, because it asks the
                questions we would otherwise have to ask you. If you would
                rather just talk, the{" "}
                <Link
                  href="/contact"
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  contact page
                </Link>{" "}
                has every route we actually have.
              </p>
              <div className="mt-1">
                <ButtonLink href="/plan" size="lg">
                  Start planning
                </ButtonLink>
              </div>
            </div>

            <div className="flex h-fit flex-col gap-2 border-t border-line pt-4 lg:pt-6">
              <span className="eyebrow text-ink-subtle">The legal entity</span>
              <p className="text-small text-ink-muted">
                {siteConfig.name} is a trading name of {siteConfig.legalName}.
                The entity holds other trading names, which are unrelated
                businesses serving different customers — they have no bearing on
                this one beyond appearing where the law requires the entity to
                be named.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <StickyCta />
    </>
  );
}

function Instead({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-line-strong" />
      <span>{children}</span>
    </li>
  );
}
