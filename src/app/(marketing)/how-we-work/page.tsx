import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Prose } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { responseSlaHours, siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "How we work",
  description:
    "What actually happens after you submit the form: the response commitment, how we select and check vendors, what we do not claim, and what you own.",
  alternates: { canonical: "/how-we-work" },
};

/**
 * The process page.
 *
 * VENDOR VETTING IS LEGALLY LOAD-BEARING. Publishing "we verify insurance and
 * licensing" converts a marketing line into a performance promise with two
 * independent failure modes: the voluntary undertaking doctrine plus negligent
 * selection, and CUTPA deception if the check is not actually performed. So
 * this page states only what is genuinely done today, in the present tense, and
 * says plainly where the standard is still being built. See docs/DECISIONS.md
 * D-013 and docs/TRUST_STRATEGY.md before changing a word of the vetting
 * section.
 */
export default function HowWeWorkPage() {
  const slaHours = responseSlaHours();
  const base = siteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: "How we work",
        item: `${base}/how-we-work`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHeader
        eyebrow="Process"
        title="What actually happens after you submit the form."
        standfirst="No discovery call you have to sit through before anyone tells you anything useful. Here is the whole sequence, including the parts that cost us bookings."
        crumb={{ href: "/how-we-work", label: "How we work" }}
      />

      <Prose>
        <h2>The response commitment</h2>
        <p>
          Every inquiry gets a real reply within <strong>{slaHours} hours</strong>.
          That is not a slogan on a page. When your form saves, the system stores
          a response deadline against it, and anything past that deadline is
          flagged internally until a person actually answers it. Opening your
          inquiry does not stop the clock; replying to you does.
        </p>
        <p>
          The reply comes from a person who read what you wrote. If we need more
          information to be useful, we ask for the specific thing rather than
          booking a call to find out.
        </p>

        <h2>The four stages</h2>
        <ol>
          <li>
            <strong>Inquiry.</strong> Five questions, about ninety seconds. We
            save your answers as you go, so a dropped connection does not cost
            you the form.
          </li>
          <li>
            <strong>First reply, within {slaHours} hours.</strong> What we would
            do, roughly what it involves, and the questions we would need
            answered next. If we are not the right fit, this is where we say so.
          </li>
          <li>
            <strong>Scoping.</strong> We agree what we are running and what you
            are keeping. This is written down before any money moves, because
            &ldquo;I thought you were handling that&rdquo; is the failure mode
            that ruins events.
          </li>
          <li>
            <strong>Delivery.</strong> We source, we coordinate, we hold the
            timeline, and we are there on the day.
          </li>
        </ol>

        <h2>How we select vendors</h2>
        <p>
          The vetting is the value. A customer who cannot judge a caterer can
          judge whether the person recommending one has a standard.
        </p>
        <p>
          Here is ours, stated honestly at the stage it is actually at. We are a
          new company, and our vendor file is being built rather than inherited.
          What we do today, on every provider we put in front of you:
        </p>
        <ul>
          <li>
            We confirm the provider is a real operating business, reachable at a
            real address, before we recommend them.
          </li>
          <li>
            We read the contract they intend you to sign, and we tell you what
            we would change in it.
          </li>
          <li>
            We check their terms against the venue&apos;s own policies, because
            the conflict between those two documents is where most event
            problems actually start.
          </li>
          <li>
            Where a provider operates in a licensed category — transportation
            being the obvious one — we ask for their licence and certificate of
            insurance, and we record what we were shown and when.
          </li>
        </ul>
        <p>
          <strong>What we do not claim.</strong> We do not describe ourselves as
          having &ldquo;fully vetted&rdquo; a network we are still building, and
          we will not publish a vetting badge until there is a documented file
          behind every provider it covers. If a specific check matters to you,
          ask us what we did and we will tell you exactly what we have on file.
        </p>

        <h2>What we coordinate, and what we do not operate</h2>
        <p>
          {siteConfig.name} holds the customer relationship and the coordination.
          The work itself — catering, florals, photography, rentals, production,
          transportation — is delivered by independent providers.
        </p>
        <p>
          That distinction is real, not a disclaimer. We do not own vehicles or
          employ drivers. Where an event needs transportation, we arrange and
          schedule it through independent licensed and insured carriers, and your
          transportation contract is directly with the carrier.
        </p>

        <h2>Where we work</h2>
        <p>
          Connecticut. If your event is elsewhere in New England, tell us on the
          form and we will be straight with you about whether we can help — which
          quite often means pointing you at someone local who can.
        </p>

        <h2>What you keep</h2>
        <ul>
          <li>Every decision that is actually about taste.</li>
          <li>
            Your own vendor contracts. We read them first and tell you what to
            change; we do not sign on your behalf.
          </li>
          <li>
            The right to take part of it back. If you decide to run something
            yourself, we will rescope rather than bill you for work you are doing.
          </li>
        </ul>

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
