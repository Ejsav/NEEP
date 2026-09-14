import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/site/page-header";
import { responseSlaHours } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How this site is built for keyboard and assistive technology users, what is tested automatically, and what to do if something does not work for you.",
  alternates: { canonical: "/accessibility" },
};

/**
 * Accessibility statement.
 *
 * Claims here are limited to what is actually enforced. Every item under "what
 * is checked automatically" corresponds to a real assertion in
 * scripts/page-contract.mjs or scripts/verify-money-path.mjs that fails the
 * build, which is what separates this from the usual statement of intent.
 */
export default function AccessibilityPage() {
  const slaHours = responseSlaHours();

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Accessibility"
        standfirst="The standard we build to, what is actually verified on every change, and the honest limits of that."
        crumb={{ href: "/accessibility", label: "Accessibility" }}
      />

      <Prose>
        <h2>The standard</h2>
        <p>
          We build {siteConfig.name} to meet WCAG 2.2 Level AA. Accessibility is
          part of what &ldquo;finished&rdquo; means here, not a ticket raised
          after launch.
        </p>

        <h2>What is checked automatically, on every change</h2>
        <p>
          These are not aspirations. Each one is asserted by a test that fails
          the build if it breaks:
        </p>
        <ul>
          <li>Every page has exactly one main heading, and heading levels never skip.</li>
          <li>Every form control has a real label, not a placeholder standing in for one.</li>
          <li>
            Error messages are tied to their field and announced by screen
            readers when they appear.
          </li>
          <li>
            The whole inquiry flow can be completed with a keyboard alone, and
            focus is always visibly indicated.
          </li>
          <li>No page scrolls sideways at 375 pixels wide.</li>
          <li>Every image carries alternative text.</li>
          <li>The page works with JavaScript switched off entirely.</li>
        </ul>

        <h2>Other things we have done deliberately</h2>
        <ul>
          <li>
            Colour is never the only way meaning is carried, and text contrast
            targets AA at minimum.
          </li>
          <li>
            If your system asks for reduced motion, animation is removed rather
            than merely shortened.
          </li>
          <li>
            Touch targets are at least 44 pixels, which is comfortable on a phone.
          </li>
          <li>
            Steps of the planner that are not currently in view are made properly
            inert, so a screen reader or keyboard never wanders into a question
            you have not reached.
          </li>
          <li>The site remains usable at 200% zoom.</li>
        </ul>

        <h2>Where we are honest about the limits</h2>
        <p>
          Automated checks catch structure, not experience. They cannot tell us
          whether a screen reader user finds the planner sensible to work
          through, and we have not yet had this site independently audited or
          tested with a panel of assistive technology users. Until that happens,
          we would rather say so than claim a level of confidence we have not
          earned.
        </p>

        <h2>If something does not work</h2>
        <p>
          Tell us and we will fix it. An accessibility problem that stops you
          using this site is a defect, and it gets treated as one. Send it
          through the{" "}
          <Link
            href="/contact"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            contact page
          </Link>{" "}
          and you will hear back within {slaHours} hours.
        </p>
        <p>
          If it is the website itself that is blocking you from reaching us, and
          a phone number is published on the contact page, use that instead — we
          would rather hear about it by any route than not hear about it.
        </p>
      </Prose>
    </>
  );
}
