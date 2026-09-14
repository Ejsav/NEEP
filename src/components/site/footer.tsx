import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { VERTICALS } from "@/lib/domain/verticals";

/**
 * Site footer.
 *
 * Two things here are legally load-bearing, not decoration:
 *
 *  1. The transportation disclosure. Connecticut's livery statute (CGS
 *     13b-101) turns on whether a business "represents itself to be in the
 *     business of transporting passengers for hire". The company owns no
 *     vehicles, employs no drivers and holds no carrier authority, so this
 *     states the coordinator relationship plainly rather than leaving the net
 *     impression to chance.
 *  2. The legal entity name, surfaced only where it must be.
 *
 * Neither may be softened or removed for design reasons. See CLAUDE.md.
 *
 * The navigation here is also doing real work: it is what stops the trust and
 * legal pages from being orphans, since nothing else on the site links to them
 * from every page.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const { email, phone, phoneDisplay } = siteConfig.contact;

  return (
    <footer className="mt-24 border-t border-line bg-paper-sunk">
      <div className="mx-auto flex max-w-wide flex-col gap-8 px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex max-w-measure flex-col gap-2">
            <span className="font-display text-heading-2 text-ink">
              {siteConfig.name}
            </span>
            <p className="text-small text-ink-muted">{siteConfig.tagline}</p>
            <p className="text-micro text-ink-subtle">
              Serving {siteConfig.serviceArea.description}.
            </p>
          </div>

          <nav aria-label="Footer" className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2 text-small">
              <span className="eyebrow text-ink-subtle">Services</span>
              {VERTICALS.map((vertical) => (
                <Link
                  key={vertical.slug}
                  href={`/${vertical.slug}`}
                  className="text-ink-muted hover:text-accent"
                >
                  {vertical.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-small">
              <span className="eyebrow text-ink-subtle">Company</span>
              <Link href="/how-we-work" className="text-ink-muted hover:text-accent">
                How we work
              </Link>
              <Link href="/pricing" className="text-ink-muted hover:text-accent">
                What events cost
              </Link>
              <Link href="/about" className="text-ink-muted hover:text-accent">
                About
              </Link>
              <Link href="/contact" className="text-ink-muted hover:text-accent">
                Contact
              </Link>
            </div>
          </nav>

          {email || phone ? (
            <div className="flex flex-col gap-2 text-small">
              <span className="eyebrow text-ink-subtle">Contact</span>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  {phoneDisplay ?? phone}
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  {email}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 text-micro text-ink-subtle">
          <p className="max-w-measure">
            <strong className="font-semibold text-ink-muted">
              Transportation:
            </strong>{" "}
            {siteConfig.name} does not own vehicles or employ drivers. When an
            event needs transportation, we coordinate it through independent,
            licensed and insured third-party carriers. Your transportation
            contract is with the carrier.
          </p>
          {/*
            WCAG 2.2 SC 2.5.8: these are standalone targets rather than links
            inside a sentence, so they need 24x24. At the micro size the text is
            19px tall, which is why the hit area is set explicitly here.
          */}
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link
              href="/privacy"
              className="inline-flex min-h-6 items-center hover:text-accent"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-6 items-center hover:text-accent"
            >
              Terms
            </Link>
            <Link
              href="/accessibility"
              className="inline-flex min-h-6 items-center hover:text-accent"
            >
              Accessibility
            </Link>
          </nav>
          <p>
            &copy; {year} {siteConfig.legalName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
