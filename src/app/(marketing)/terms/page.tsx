import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/site/page-header";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms that apply to this website and to inquiries made through it, including what the coordinator relationship does and does not mean.",
  alternates: { canonical: "/terms" },
};

/**
 * Website terms.
 *
 * Scoped to the website and to the inquiry itself. The terms of an actual
 * engagement are the written scope agreed with each customer - this page must
 * never be mistaken for that, and says so.
 *
 * The coordinator and transportation sections are legally load-bearing. See
 * docs/DECISIONS.md D-013.
 */
export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms"
        standfirst="What applies when you use this site and send us an inquiry — and what does not, because it belongs in a written scope instead."
        crumb={{ href: "/terms", label: "Terms" }}
      />

      <Prose>
        <p>
          This site is operated by {siteConfig.legalName}, trading as{" "}
          {siteConfig.name}. Using it means these terms apply to you.
        </p>

        <h2>What an inquiry is, and is not</h2>
        <p>
          Sending an inquiry starts a conversation. It is not a booking, it does
          not reserve a date, and it does not commit either of us to anything. No
          date is held until we have both agreed a written scope.
        </p>
        <p>
          Anything we tell you before that scope exists — availability,
          approximate cost, what we would suggest — is an estimate given in good
          faith on the information we have. It is not a quote and not an offer.
        </p>

        <h2>We coordinate; we do not operate</h2>
        <p>
          {siteConfig.name} holds your relationship and the coordination. The
          work itself is carried out by independent third-party providers:
          venues, caterers, photographers, florists, entertainment, rentals and
          transportation operators.
        </p>
        <p>
          Unless a written scope says otherwise, your contract for those services
          is with the provider, not with us. We are not their agent for the
          purpose of their performance, and their terms — including their
          cancellation and deposit terms — apply directly between you and them.
          We will tell you what those terms say before you sign them.
        </p>

        <h2>Transportation specifically</h2>
        <p>
          We do not own vehicles, employ drivers, or hold carrier authority, and
          we are not a transportation operator. Where an event requires
          transportation we arrange and schedule it through independent licensed
          and insured carriers. <strong>Your transportation contract is with
          the carrier</strong>, and the carrier is responsible for the operation
          of that service.
        </p>

        <h2>Where we work</h2>
        <p>
          We operate in Connecticut. We are not offering services elsewhere, and
          nothing on this site should be read as a representation that we are.
        </p>

        <h2>What is on this site</h2>
        <p>
          We write this content carefully and we do not publish claims we cannot
          support. Venue details, policies, timings and costs described anywhere
          on this site can change without us being told, so treat them as a
          starting point and confirm anything that your decision depends on. We
          state on each venue record where a fact came from and when we last
          checked it.
        </p>
        <p>
          The content, design and text here belong to us. Please do not reproduce
          them commercially without asking.
        </p>

        <h2>The engagement itself</h2>
        <p>
          The terms governing an actual event — scope, fees, payment schedule,
          cancellation, postponement, liability and insurance — live in the
          written agreement for that event. This page does not replace it,
          summarise it, or override it. If the two ever appear to conflict, the
          written agreement is what counts.
        </p>

        <h2>The legal entity</h2>
        <p>
          {siteConfig.name} is a trading name of {siteConfig.legalName}. The
          entity holds other trading names, which are separate businesses with
          their own customers and their own terms. Nothing here applies to them
          and nothing about them applies here.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Connecticut.
        </p>

        <h2>Questions</h2>
        <p>
          Ask us through the{" "}
          <Link
            href="/contact"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            contact page
          </Link>{" "}
          and we will answer plainly.
        </p>
      </Prose>
    </>
  );
}
