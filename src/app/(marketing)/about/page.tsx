import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Prose } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

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
      />

      <Prose>
        <h2>What this company is</h2>
        <p>
          {siteConfig.name} is a Connecticut event services company. We own the
          relationship with you from the first message to the end of the event,
          and we coordinate delivery through independent providers — venues,
          caterers, photographers, florists, entertainment, rentals and
          transportation.
        </p>
        <p>
          The point is that there is one place to start, and one person
          accountable, instead of you separately finding and managing every
          vendor an event turns out to need.
        </p>

        <h2>Where we are, honestly</h2>
        <p>
          This company is new. At the time of writing it has no completed events
          on the books, no reviews, no case studies and no awards. You will not
          find a wall of client logos here, because there is nothing truthful to
          put on it.
        </p>
        <p>
          That is an uncomfortable thing to publish and it is the right thing to
          publish. Every alternative — a stock photograph of a &ldquo;team&rdquo;,
          a borrowed testimonial, a vague claim about years of experience — is a
          lie that a customer would eventually catch. What you get instead is a
          process you can read in full, a response commitment the system
          enforces, and a company that will tell you when the answer is no.
        </p>
        <p>
          When there is real proof, it will appear on this site with names
          attached and permission given. Not before.
        </p>

        <h2>The four things we do</h2>
        <p>
          Weddings, corporate events, private events, and venue and vendor
          coordination. That list is not going to quietly grow in order to win a
          booking. If what you need is outside it, we will say so.
        </p>

        <h2>What we do not do</h2>
        <p>
          We are not a transportation operator. We own no vehicles, employ no
          drivers, and hold no carrier authority. Where an event needs
          transportation we arrange and schedule it through independent licensed
          and insured carriers, and the transportation contract is between you
          and that carrier.
        </p>
        <p>
          We also do not operate outside Connecticut today. The company is built
          to expand across New England, but we are not going to imply we already
          have.
        </p>

        <h2>The legal entity</h2>
        <p>
          {siteConfig.name} is a trading name of {siteConfig.legalName}. The
          entity holds other trading names, which are unrelated businesses
          serving different customers — they have no bearing on this one beyond
          appearing where the law requires the entity to be named.
        </p>

        <h2>Talking to us</h2>
        <p>
          The{" "}
          <Link
            href="/plan"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            planner
          </Link>{" "}
          is the fastest route to a useful answer, because it asks the questions
          we would otherwise have to ask you. If you would rather just talk, the{" "}
          <Link
            href="/contact"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            contact page
          </Link>{" "}
          has every route we actually have.
        </p>

        <div className="mt-4">
          <ButtonLink href="/plan" size="lg">
            Start planning
          </ButtonLink>
        </div>
      </Prose>

      <StickyCta />
    </>
  );
}
