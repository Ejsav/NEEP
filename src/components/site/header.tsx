import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Site header. No JavaScript: the nav is a short, honest list that fits on a
 * phone without a hamburger. A menu button that exists to hide four links is
 * complexity with no payoff.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-wide flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
