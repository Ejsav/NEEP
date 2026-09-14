import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/site/page-header";
import { SectionHeader } from "@/components/sections/section-header";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
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
        aside={
          venues.length === 0 ? (
            /*
             * The honest empty state, in the masthead rather than alone in a
             * band below it. "There is nothing here yet, and here is why" is
             * the whole message of this page right now, so it should be the
             * first thing beside the title rather than an afterthought.
             */
            <div className="flex h-fit flex-col gap-3 rounded-xl border border-line bg-paper-raised p-6">
              <h2 className="font-display text-heading-2 text-ink">
                No records published yet.
              </h2>
              <p className="text-small text-ink-muted">
                Copying numbers off an aggregator would fill this page today. It
                would also be the only part of this site you could not trust, so
                it stays empty until the work is done.
              </p>
              <p className="text-small text-ink-muted">
                If you have a venue in mind now, name it in the planner. We will
                tell you what we know about it, including when the answer is
                that we do not know yet.
              </p>
              <div className="mt-1">
                <ButtonLink href="/plan" variant="secondary">
                  Ask about a venue
                </ButtonLink>
              </div>
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        {venues.length === 0 ? (
          /*
           * What a published record will contain. This is not a promise about
           * content that might appear - it is the gate in src/lib/venues/gate.ts
           * restated in prose, and a record that does not clear it is excluded
           * from this page and from the sitemap by the same function.
           */
          <>
            <SectionHeader
              title="What a published record will contain"
              lede="A venue record here is a reference document, not a listing. This is what goes into one, and the standard it clears before it appears at all."
            />
            <div className="mt-10 sm:mt-12">
              <RuledList>
                <RuledItem heading="Capacity, by configuration">
                  Not one number. Seated dinner, seated with a dance floor,
                  ceremony, and standing reception are four different figures at
                  the same venue, and the gap between them is where guest lists
                  go wrong.
                </RuledItem>
                <RuledItem heading="Parking, and what happens when it runs out" delayMs={60}>
                  The real on-site count, whether overflow exists, and whether
                  the shortfall is the reason the event needs a shuttle at all.
                </RuledItem>
                <RuledItem heading="Whose curfew applies" delayMs={120}>
                  The venue&apos;s own end time and the town&apos;s noise
                  ordinance are different constraints, and the earlier of the two
                  is the one that ends your reception.
                </RuledItem>
                <RuledItem heading="What the vendor policy actually requires" delayMs={180}>
                  Open, preferred or exclusive, stated as the venue states it —
                  because an exclusive caterer list removes your ability to
                  compete the largest line in the budget.
                </RuledItem>
                <RuledItem heading="A source and a date on every figure" delayMs={240}>
                  Each fact carries where it came from and when it was checked.
                  A field without that is recorded as not confirmed rather than
                  printed as though it were known.
                </RuledItem>
                <RuledItem heading="Enough substance to be worth a page" delayMs={300}>
                  A record that clears none of the above is not published, is
                  not indexed, and is left out of the sitemap. That rule is code,
                  not a policy someone has to remember.
                </RuledItem>
              </RuledList>
            </div>
          </>
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

