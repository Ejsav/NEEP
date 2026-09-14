import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/site/page-header";
import { StickyCta } from "@/components/site/sticky-cta";
import { listPublishableVenues } from "@/lib/venues/queries";
import { REGIONS } from "@/lib/venues/regions";
import { siteUrl } from "@/lib/env";

/**
 * Indexability is decided here rather than by a <meta> tag in the body.
 * Rendering one inline left the layout's own robots tag in place alongside it,
 * so the page emitted two conflicting directives.
 */
export async function generateMetadata(): Promise<Metadata> {
  const venues = await listPublishableVenues();
  return {
    title: "Connecticut venues",
    description:
      "Connecticut event venues with the details that actually decide them: capacity by configuration, parking, curfew, vendor policy — each fact sourced and dated.",
    alternates: { canonical: "/venues" },
    // A directory of nothing is exactly the thin page the gate exists to
    // prevent, and that rule applies to the index as much as to the records.
    ...(venues.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export const dynamic = "force-dynamic";

/**
 * The venue directory.
 *
 * Only records that clear lib/venues/gate.ts appear here, and while there are
 * none the page tells the truth about that rather than showing an empty grid
 * with a spinner. It also marks itself noindex until it has something worth
 * indexing - a directory of nothing is exactly the thin page the gate exists
 * to prevent, and that rule has to apply to the index as well as the records.
 */
export default async function VenuesPage() {
  const venues = await listPublishableVenues();
  const base = siteUrl();

  const byRegion = REGIONS.map((region) => ({
    region,
    items: venues.filter((v) => v.venue.region === region.value),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {venues.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: base },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Venues",
                  item: `${base}/venues`,
                },
              ],
            }),
          }}
        />
      ) : null}

      <PageHeader
        eyebrow="Venues"
        title="Connecticut venues, with the details that decide them."
        standfirst="Capacity by configuration, the real parking count, whose curfew applies, and whether the caterer list is mandatory. Every figure carries its source and the date we checked it."
        crumb={{ href: "/venues", label: "Venues" }}
      />

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        {venues.length === 0 ? (
          /*
           * The honest empty state. Naming what the records will contain is
           * more useful than a placeholder grid, and it is the truth.
           */
          <div className="flex max-w-measure flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6 sm:p-8">
            <h2 className="font-display text-heading-1 text-ink">
              There are no venue records published yet.
            </h2>
            <p className="text-body text-ink-muted">
              We are building these properly rather than quickly. A record
              publishes only once we have confirmed its capacity by
              configuration, its parking, whose curfew applies — the venue&apos;s
              or the town&apos;s — and what its vendor policy actually requires,
              each with a source and the date it was checked.
            </p>
            <p className="text-body text-ink-muted">
              Copying numbers off an aggregator would fill this page today. It
              would also be the only part of this site you could not trust, so
              it stays empty until the work is done.
            </p>
            <p className="text-small text-ink-muted">
              If you have a venue in mind now, name it in the planner. We will
              tell you what we know about it, including when the answer is that
              we do not know yet.
            </p>
            <div className="mt-1">
              <ButtonLink href="/plan" size="lg">
                Ask about a venue
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {byRegion.map(({ region, items }) => (
              <section key={region.slug} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-heading-1 text-ink">
                    <Link
                      href={`/guides/${region.slug}`}
                      className="hover:text-accent"
                    >
                      {region.name}
                    </Link>
                  </h2>
                  <p className="max-w-measure text-small text-ink-muted">
                    {region.blurb}
                  </p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {items.map(({ venue }) => (
                    <li key={venue.id}>
                      <Link
                        href={`/venues/${venue.slug}`}
                        className="flex h-full flex-col gap-2 rounded-xl border border-line bg-paper-raised p-5 transition duration-150 ease-out-quiet hover:-translate-y-px hover:border-line-strong hover:shadow-raised"
                      >
                        <h3 className="font-display text-heading-2 text-ink">
                          {venue.name}
                        </h3>
                        <p className="text-micro text-ink-subtle">
                          {venue.town}
                          {venue.venueType ? ` · ${venue.venueType}` : ""}
                        </p>
                        {venue.capacitySeated ? (
                          <p className="text-small text-ink-muted" data-numeric>
                            Seats up to {venue.capacitySeated}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <StickyCta />
    </>
  );
}

