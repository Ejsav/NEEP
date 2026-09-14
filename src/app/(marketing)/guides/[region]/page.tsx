import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { StickyCta } from "@/components/site/sticky-cta";
import { REGIONS, regionBySlug } from "@/lib/venues/regions";
import { listPublishableByRegion } from "@/lib/venues/queries";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const region = regionBySlug((await params).region);
  if (!region) return {};

  const venues = await listPublishableByRegion(region.value);

  return {
    title: `${region.short} venues`,
    description: `Event venues in ${region.name}: capacity, parking, curfew and vendor policy, each sourced and dated.`,
    alternates: { canonical: `/guides/${region.slug}` },
    // A guide with no records behind it is a thin page. The same rule that
    // governs venue records governs the pages that index them.
    ...(venues.length === 0
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

/**
 * A regional venue guide.
 *
 * This is the corridor the research says is actually winnable: independent
 * photographer blogs with modest authority rank for Connecticut venue-guide
 * terms, which means authority is not the barrier - depth is. The logistics
 * detail is the differentiator, not the photography. See docs/SEO_STRATEGY.md.
 *
 * Which is why this page stays noindex until it has records: entering that
 * corridor with a page thinner than the ones already ranking would achieve
 * nothing except teaching Google that this domain publishes filler.
 */
export default async function RegionGuidePage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const region = regionBySlug((await params).region);
  if (!region) notFound();

  const venues = await listPublishableByRegion(region.value);
  const base = siteUrl();

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
                { "@type": "ListItem", position: 2, name: "Venues", item: `${base}/venues` },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: region.short,
                  item: `${base}/guides/${region.slug}`,
                },
              ],
            }),
          }}
        />
      ) : null}

      <div className="border-b border-line">
        <div className="mx-auto max-w-content px-5 pb-12 pt-6 sm:px-8 sm:pb-16">
          <Breadcrumbs
            items={[
              { href: "/venues", label: "Venues" },
              { href: `/guides/${region.slug}`, label: region.short },
            ]}
          />
          <div className="mt-6 flex max-w-measure flex-col gap-4">
            <span className="eyebrow">Regional guide</span>
            <h1 className="text-display-1 font-display text-ink">{region.name}</h1>
            <p className="text-body-lg text-ink-muted">{region.blurb}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        {venues.length === 0 ? (
          <div className="flex max-w-measure flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6 sm:p-8">
            <h2 className="font-display text-heading-1 text-ink">
              No records published for {region.short} yet.
            </h2>
            <p className="text-body text-ink-muted">
              This guide publishes when there are venues behind it that have been
              properly checked — capacity by configuration, the real parking
              count, whose curfew applies, and what the vendor policy actually
              requires, each with a source and a date.
            </p>
            <p className="text-small text-ink-muted">
              If you are looking at somewhere in {region.short} now, name it in
              the planner and we will tell you what we know.
            </p>
            <div className="mt-1">
              <ButtonLink href="/plan" size="lg">
                Ask about a venue
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {venues.map(({ venue }) => (
              <li key={venue.id}>
                <Link
                  href={`/venues/${venue.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-line bg-paper-raised p-5 transition duration-150 ease-out-quiet hover:-translate-y-px hover:border-line-strong hover:shadow-raised"
                >
                  <h2 className="font-display text-heading-2 text-ink">
                    {venue.name}
                  </h2>
                  <p className="text-micro text-ink-subtle">{venue.town}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 max-w-measure text-small text-ink-muted">
          Planning a wedding in {region.short}?{" "}
          <Link
            href="/weddings"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            How we run weddings
          </Link>
          , or see{" "}
          <Link
            href="/venues"
            className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            every region
          </Link>
          .
        </p>
      </div>

      <StickyCta />
    </>
  );
}
