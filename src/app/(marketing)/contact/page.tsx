import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { responseSlaHours, siteUrl } from "@/lib/env";
import { hasAnyDirectContact, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach New England Event Planners, what happens when you do, and how long it takes to hear back.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact.
 *
 * Every route listed here is real or absent. A contact method that is not
 * configured renders as absent rather than as a placeholder - a phone number
 * that does not connect destroys trust on the one call that mattered, which is
 * strictly worse than having no number at all. See src/lib/site-config.ts.
 */
export default function ContactPage() {
  const slaHours = responseSlaHours();
  const base = siteUrl();
  const { email, phone, phoneDisplay } = siteConfig.contact;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Contact", item: `${base}/contact` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHeader
        eyebrow="Contact"
        title="Reach a person, not a queue."
        standfirst={`However you get in touch, you get a real reply within ${slaHours} hours from someone who read what you wrote.`}
        crumb={{ href: "/contact", label: "Contact" }}
        aside={
          <div className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
            <h2 className="font-display text-heading-2 text-ink">
              What happens next
            </h2>
            <ol className="flex flex-col gap-3 text-small text-ink-muted">
              <li>
                <strong className="font-semibold text-ink">
                  A person reads it.
                </strong>{" "}
                Your inquiry is stored with a {slaHours}-hour deadline attached,
                and flagged internally if it is missed.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  You get a straight answer.
                </strong>{" "}
                What we would do, what it involves, and what we would need to
                know next.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  No sequence, ever.
                </strong>{" "}
                Filling in a form does not subscribe you to anything. There is
                no drip campaign here to be added to.
              </li>
            </ol>
          </div>
        }
      />

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <section className="flex flex-col gap-4 border-t-2 border-sage pt-4">
            <h2 className="font-display text-heading-1 text-ink">
              Best route: the planner
            </h2>
            <p className="text-body text-ink-muted">
              Five questions, about ninety seconds. It asks the things we would
              otherwise have to email you about, which is why an inquiry that
              comes through it gets a much more useful first answer than
              &ldquo;hi, are you available in June?&rdquo; does.
            </p>
            <div className="mt-1">
              <ButtonLink href="/plan" size="lg">
                Start planning
              </ButtonLink>
            </div>
            <p className="text-small text-ink-muted">
              We work in {siteConfig.serviceArea.state}. If your event is
              elsewhere in New England, say so and we will tell you honestly
              whether we can help. Read{" "}
              <Link
                href="/how-we-work"
                className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                how we work
              </Link>
              .
            </p>
          </section>

          <section className="flex flex-col gap-4 border-t-2 border-sage pt-4">
            <h2 className="font-display text-heading-1 text-ink">
              Direct routes
            </h2>

            {hasAnyDirectContact() ? (
              <dl className="flex flex-col gap-4">
                {phone ? (
                  <div className="flex flex-col gap-1">
                    <dt className="text-small font-semibold text-ink">Phone</dt>
                    <dd className="text-body">
                      <a
                        href={`tel:${phone}`}
                        className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                      >
                        {phoneDisplay ?? phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {email ? (
                  <div className="flex flex-col gap-1">
                    <dt className="text-small font-semibold text-ink">Email</dt>
                    <dd className="text-body">
                      <a
                        href={`mailto:${email}`}
                        className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                      >
                        {email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              /*
               * The honest empty state. Rather than inventing a number, we say
               * the truth: the form is currently the only route in, and it
               * genuinely reaches a person.
               */
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-paper-sunk p-5">
                <p className="text-body text-ink">
                  A published phone line and inbox are not live yet.
                </p>
                <p className="text-small text-ink-muted">
                  Rather than print a number that rings nowhere, we have left
                  this blank until it is real. The planner is monitored by a
                  person and is the fastest way to reach us — you will hear back
                  within {slaHours} hours.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <StickyCta />
    </>
  );
}
