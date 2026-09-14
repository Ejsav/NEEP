import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/site/page-header";
import { responseSlaHours } from "@/lib/env";
import { hasAnyDirectContact, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What New England Event Planners collects, why, how long it is kept, and what we deliberately do not store.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy policy.
 *
 * Written to describe what this system ACTUALLY does, not what a template
 * assumes. Every claim here is checkable against the code: the cookie names are
 * the ones set in src/proxy.ts and src/lib/inquiries/drafts.ts, the IP handling
 * is src/lib/security/hash.ts, and the no-PII-in-drafts claim is enforced by
 * the draft schema and asserted in tests/drafts.test.ts.
 *
 * If the data handling changes, this page changes in the same commit.
 */
export default function PrivacyPage() {
  const slaHours = responseSlaHours();

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        standfirst="What we collect, why we collect it, and the things we deliberately do not store."
        crumb={{ href: "/privacy", label: "Privacy" }}
      />

      <Prose>
        <p>
          This policy describes how {siteConfig.legalName}, trading as{" "}
          {siteConfig.name}, handles information collected through this website.
          It describes what the site actually does today.
        </p>

        <h2>What we collect when you send an inquiry</h2>
        <p>
          The planner asks for your name, email address, an optional phone
          number, and details about your event — type, date, guest count, town,
          venue status, the level of support you want, a budget band, and
          anything you choose to write in the message field. We store what you
          submit so we can answer it.
        </p>

        <h2>Answers saved before you submit</h2>
        <p>
          The planner saves your answers as you move between steps, so a dropped
          connection or a closed tab does not cost you the form.
        </p>
        <p>
          <strong>These partial saves never include contact details.</strong>{" "}
          Your name, email address and phone number are asked for on the final
          step and are stored only when you actually submit. A partial record
          holds event details only, and is linked to a randomly generated
          identifier in a cookie rather than to you.
        </p>

        <h2>How you got here</h2>
        <p>
          We record the page you first landed on, the page you came from, and any
          campaign parameters in the link you followed. This tells us which of
          our efforts actually reach people. It is stored against your inquiry
          and is not shared.
        </p>

        <h2>What we deliberately do not store</h2>
        <ul>
          <li>
            <strong>Your IP address.</strong> Abuse prevention needs to
            distinguish one visitor from another, not to identify them, so the
            address is converted to a keyed one-way hash the moment it arrives.
            The address itself is never written down.
          </li>
          <li>
            <strong>Contact details you typed but did not send.</strong> See
            above.
          </li>
          <li>
            <strong>Analytics or advertising profiles.</strong> There are no
            third-party analytics, advertising or social tracking scripts on this
            site.
          </li>
        </ul>

        <h2>Cookies</h2>
        <p>These are the only cookies this site sets:</p>
        <ul>
          <li>
            <strong>neep_ft, neep_lt, neep_v</strong> — how you arrived and how
            many times you have visited. Set by us, not readable by JavaScript,
            and used only for our own attribution.
          </li>
          <li>
            <strong>neep_draft</strong> — a random identifier linking you to your
            in-progress planner answers. Expires after 12 hours. Contains no
            personal information.
          </li>
          <li>
            <strong>An administrator session cookie</strong> — only ever set for
            our own staff signing into the private admin area.
          </li>
        </ul>
        <p>
          There is no advertising cookie, no tracking pixel and no cross-site
          identifier here, which is why there is no consent banner.
        </p>

        <h2>Who else sees it</h2>
        <p>
          We use an email delivery provider to send notification and reply
          emails, and a hosting provider to run this site and its database. Those
          providers process the data on our instructions in order to provide
          those services.
        </p>
        <p>
          When you decide to proceed with an event, we share what is necessary
          with the specific providers involved — a caterer needs a headcount, a
          venue needs a date. We do not sell your information, and we do not pass
          it to anyone for their own marketing.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Inquiries are retained while they are live and afterwards as a business
          record. Partial planner answers expire on their own and are cleared
          routinely. Abuse-prevention counters are short-lived and hold no
          personal data.
        </p>

        <h2>Your choices</h2>
        <p>
          You can ask us what we hold about you, ask us to correct it, or ask us
          to delete it. Submitting the form does not subscribe you to anything —
          there is no marketing sequence here to be added to, so there is nothing
          to unsubscribe from.
        </p>

        <h2>Contacting us about privacy</h2>
        {hasAnyDirectContact() ? (
          <p>
            Write to us using the routes on the{" "}
            <Link
              href="/contact"
              className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
            >
              contact page
            </Link>
            . We reply within {slaHours} hours.
          </p>
        ) : (
          <p>
            A published inbox is not live yet. Until it is, send a request
            through the{" "}
            <Link
              href="/plan"
              className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
            >
              planner
            </Link>{" "}
            — it reaches a person, and we reply within {slaHours} hours.
          </p>
        )}

        <h2>Changes</h2>
        <p>
          If what we do with data changes, this page changes with it rather than
          afterwards.
        </p>
      </Prose>
    </>
  );
}
