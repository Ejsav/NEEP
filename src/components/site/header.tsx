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
 * screens, so the header does not have to.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-wide flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
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

        <nav aria-label="Services" className="flex flex-wrap items-center gap-x-4 gap-y-1">
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

        <div className="flex items-center gap-4">
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
