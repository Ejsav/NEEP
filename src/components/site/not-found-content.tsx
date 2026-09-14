import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { VERTICALS } from "@/lib/domain/verticals";

/**
 * The 404 body, shared by the root and marketing not-found boundaries.
 *
 * A 404 on a lead-generation site is a visitor who wanted something and did not
 * get it, so this page is a recovery surface rather than an apology: it names
 * the four things the company actually does and offers the one action that
 * works from anywhere. No search box - there is nothing to search yet, and a
 * search that returns nothing is worse than no search.
 */
export function NotFoundContent() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-12 px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <div className="flex max-w-measure flex-col gap-4">
          <span className="eyebrow">Error 404</span>
          <h1 className="text-display-2 font-display text-ink">
            That page isn&apos;t here.
          </h1>
          <p className="text-body-lg text-ink-muted">
            Either the address is wrong or we moved something and did not leave a
            forwarding note. Both are on us.
          </p>
          <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/plan" size="lg">
              Start planning
            </ButtonLink>
            <Link
              href="/"
              className="text-small font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent hover:decoration-accent"
            >
              Back to the homepage
            </Link>
          </div>
        </div>

        <nav
          aria-label="Services"
          className="flex h-fit flex-col gap-1 rounded-xl border border-line bg-paper-raised p-6"
        >
          <span className="eyebrow text-ink-subtle">What we do</span>
          <ul className="mt-3 flex flex-col">
            {VERTICALS.map((vertical) => (
              <li key={vertical.slug} className="border-b border-line last:border-0">
                <Link
                  href={`/${vertical.slug}`}
                  className="flex items-center justify-between gap-4 py-3 text-small text-ink transition-colors duration-150 hover:text-accent"
                >
                  {vertical.title}
                  <span aria-hidden="true" className="text-ink-subtle">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-8 text-small text-ink-muted">
        <p>
          Looking for something else? {" "}
          <Link
            href="/how-we-work"
            className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            How we work
          </Link>
          ,{" "}
          <Link
            href="/pricing"
            className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            what events cost
          </Link>
          , or{" "}
          <Link
            href="/contact"
            className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
