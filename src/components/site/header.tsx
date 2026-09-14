import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { VERTICALS } from "@/lib/domain/verticals";

/**
 * Site header.
 *
 * No JavaScript. Four service links wrap onto a second line on a phone, which
 * is a better trade than a menu button that exists to hide four links behind a
 * tap. The sticky action bar carries the phone and the primary action on small
 * screens, so the header does not - and below `sm` the header actions are
 * hidden outright rather than duplicated.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur-sm">
      {/*
        Two rows below `lg` - wordmark and actions on the first, services on the
        second - rather than three stacked blocks. A grid does that without
        duplicating the actions markup: the nav spans both columns, so it drops
        to its own row, and at `lg` the whole thing becomes one flex row with the
        actions ordered last.
      */}
      <div className="mx-auto grid max-w-wide grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 px-5 py-3.5 sm:gap-y-3 sm:py-4 lg:flex lg:justify-between lg:gap-8 lg:px-8">
        <Link
          href="/"
          className="group inline-flex flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <span className="font-display text-heading-2 leading-none text-ink transition-colors duration-150 group-hover:text-accent">
            New England
          </span>
          <span className="eyebrow mt-1 text-ink-subtle">
            Event Planners &middot; {siteConfig.serviceArea.stateCode}
          </span>
        </Link>

        <nav
          aria-label="Services"
          className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 lg:col-span-1"
        >
          {VERTICALS.map((vertical) => (
            <Link
              key={vertical.slug}
              href={`/${vertical.slug}`}
              className="text-small text-ink-muted transition-colors duration-150 hover:text-accent"
            >
              {vertical.title}
            </Link>
          ))}
        </nav>

        {/*
          Hidden on phones, where the fixed action bar already carries a phone
          link and the same primary action within thumb reach. Repeating it here
          costs about 60px of the first screen and buys nothing.
        */}
        <div className="col-start-2 row-start-1 hidden items-center gap-4 justify-self-end sm:flex lg:order-last">
          {siteConfig.contact.phone ? (
            <a
              href={`tel:${siteConfig.contact.phone}`}
              className="text-small font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent hover:decoration-accent"
            >
              {siteConfig.contact.phoneDisplay ?? siteConfig.contact.phone}
            </a>
          ) : null}
          <ButtonLink href="/plan" variant="primary">
            Start planning
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
