import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { StickyCta } from "@/components/site/sticky-cta";
import { getPublishableVenue } from "@/lib/venues/queries";
import { isStale, renderableFields } from "@/lib/venues/gate";
import { regionByValue } from "@/lib/venues/regions";
import type { VenueFieldSource } from "@/lib/db/schema";
import { siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const record = await getPublishableVenue((await params).slug);
  if (!record) return { robots: { index: false, follow: false } };

  const { venue } = record;
  return {
    title: `${venue.name}, ${venue.town}`,
    description: `Capacity, parking, curfew and vendor policy for ${venue.name} in ${venue.town}, Connecticut — each fact sourced and dated.`,
    alternates: { canonical: `/venues/${venue.slug}` },
  };
}

/**
 * A venue record.
 *
 * Structured data is Article/WebPage authored by us, with the venue appearing
 * only as a nested, non-primary Place carrying name and sameAs. We do not own
 * these venues, and marking one up as the page's primary entity risks Google
 * associating it with our domain. Never LocalBusiness. See D-012.
 *
 * A record that does not clear the gate 404s rather than rendering thin.
 */
export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const record = await getPublishableVenue((await params).slug);
  if (!record) notFound();

  const { venue, sources } = record;
  const renderable = renderableFields(sources);
  const region = regionByValue(venue.region);
  const base = siteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `${venue.name}, ${venue.town}`,
        author: { "@type": "Organization", name: siteConfig.name, url: base },
        publisher: { "@type": "Organization", name: siteConfig.name, url: base },
        dateModified: venue.updatedAt.toISOString(),
        about: {
          // Nested and non-primary, with nothing claimed about it beyond its
          // name and its own website.
          "@type": "Place",
          name: venue.name,
          ...(venue.officialUrl ? { sameAs: venue.officialUrl } : {}),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "Venues", item: `${base}/venues` },
          {
            "@type": "ListItem",
            position: 3,
            name: venue.name,
            item: `${base}/venues/${venue.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="border-b border-line">
        <div className="mx-auto max-w-content px-5 pb-12 pt-6 sm:px-8 sm:pb-16">
          <Breadcrumbs
            items={[
              { href: "/venues", label: "Venues" },
              { href: `/venues/${venue.slug}`, label: venue.name },
            ]}
          />
          <div className="mt-6 flex max-w-measure flex-col gap-4">
            <span className="eyebrow">
              {venue.town}
              {region ? ` · ${region.short}` : ""}
            </span>
            <h1 className="text-display-1 font-display text-ink">{venue.name}</h1>
            {venue.officialUrl ? (
              <p className="text-small text-ink-muted">
                Official site:{" "}
                <a
                  href={venue.officialUrl}
                  rel="nofollow noopener"
                  className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  {new URL(venue.officialUrl).hostname}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="flex flex-col gap-10">
            {/* Tables for facts, prose for judgement. */}
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-heading-1 text-ink">The numbers</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-small">
                  <tbody>
                    <Row
                      label="Seated capacity"
                      value={venue.capacitySeated}
                      source={renderable.get("capacitySeated")}
                    />
                    <Row
                      label="Standing capacity"
                      value={venue.capacityStanding}
                      source={renderable.get("capacityStanding")}
                    />
                    <Row
                      label="Ceremony capacity"
                      value={venue.capacityCeremony}
                      source={renderable.get("capacityCeremony")}
                    />
                    <Row
                      label="Parking spaces"
                      value={venue.parkingSpaces}
                      source={renderable.get("parkingSpaces")}
                    />
                    <Row
                      label="Curfew"
                      value={venue.curfewTime}
                      source={renderable.get("curfewTime")}
                      note={venue.curfewSource ?? undefined}
                    />
                    <Row
                      label="Vendor policy"
                      value={venue.vendorPolicy}
                      source={renderable.get("vendorPolicy")}
                    />
                  </tbody>
                </table>
              </div>
              <p className="text-micro text-ink-subtle">
                Venue policies change without anyone telling us. Confirm anything
                your decision depends on, and tell us if you find something out
                of date here.
              </p>
            </section>

            {venue.narrative ? (
              <section className="flex flex-col gap-4">
                <h2 className="font-display text-heading-1 text-ink">
                  What this means in practice
                </h2>
                <div className="flex max-w-measure flex-col gap-4 text-body text-ink-muted">
                  {venue.narrative.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="flex h-fit flex-col gap-5 rounded-xl border border-line bg-paper-raised p-6 lg:sticky lg:top-8">
            <h2 className="font-display text-heading-2 text-ink">
              Planning something here?
            </h2>
            <p className="text-small text-ink-muted">
              Tell us the date and we will come back with what this venue
              actually requires — the parts that are easy to miss until the
              contract is signed.
            </p>
            <ButtonLink href={`/plan?venue=${encodeURIComponent(venue.slug)}`} size="lg">
              Start planning
            </ButtonLink>
            {region ? (
              <p className="border-t border-line pt-4 text-micro text-ink-subtle">
                More in{" "}
                <Link
                  href={`/guides/${region.slug}`}
                  className="underline decoration-line underline-offset-4 hover:text-accent"
                >
                  {region.name}
                </Link>
                .
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      <StickyCta />
    </>
  );
}

/**
 * One fact, with its provenance.
 *
 * An unsourced field renders "Not confirmed" rather than an empty cell: a blank
 * reads as "there is no parking", which is a different and wrong claim.
 */
function Row({
  label,
  value,
  source,
  note,
}: {
  label: string;
  value: string | number | null;
  source?: VenueFieldSource;
  note?: string;
}) {
  const shown = value !== null && value !== undefined && source;

  return (
    <tr className="border-b border-line align-top">
      <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">
        {label}
      </th>
      <td className="py-3 pr-4 text-ink-muted" data-numeric>
        {shown ? String(value) : <span className="text-ink-subtle">Not confirmed</span>}
        {shown && note ? (
          <span className="block text-micro text-ink-subtle">{note}</span>
        ) : null}
      </td>
      <td className="py-3 text-micro text-ink-subtle">
        {shown && source ? (
          <>
            {source.sourceUrl ? (
              <a
                href={source.sourceUrl}
                rel="nofollow noopener"
                className="underline decoration-line underline-offset-4 hover:text-accent"
              >
                Source
              </a>
            ) : (
              "Confirmed directly"
            )}
            <span className="block">
              {isStale(source) ? "Last confirmed " : "Checked "}
              {source.verifiedAt}
            </span>
          </>
        ) : null}
      </td>
    </tr>
  );
}
