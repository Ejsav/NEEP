import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { StickyCta } from "@/components/site/sticky-cta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { responseSlaHours, siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import { VERTICALS, verticalBySlug } from "@/lib/domain/verticals";

/**
 * The four vertical pillars.
 *
 * One route, four genuinely different pages: every string comes from
 * lib/domain/verticals.ts, where each vertical is written separately. A shared
 * layout is not a doorway page; shared *content* would be, which is why nothing
 * here interpolates a vertical name into a sentence.
 *
 * Schema is Service, which is a real description of what the page is about. No
 * FAQPage (Google retired the rich result), no AggregateRating, no LocalBusiness.
 * See docs/DECISIONS.md D-012.
 */

export function generateStaticParams() {
  return VERTICALS.map((v) => ({ vertical: v.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const vertical = verticalBySlug((await params).vertical);
  if (!vertical) return {};

  return {
    title: vertical.metaTitle,
    description: vertical.metaDescription,
    alternates: { canonical: `/${vertical.slug}` },
    openGraph: {
      url: `/${vertical.slug}`,
      title: `${vertical.metaTitle} | ${siteConfig.name}`,
      description: vertical.metaDescription,
    },
  };
}

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const vertical = verticalBySlug((await params).vertical);
  if (!vertical) notFound();

  const slaHours = responseSlaHours();
  const base = siteUrl();
  const plannerHref = `/plan?eventType=${vertical.eventType}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: vertical.metaTitle,
        description: vertical.metaDescription,
        serviceType: vertical.title,
        provider: {
          "@type": "Organization",
          name: siteConfig.name,
          url: base,
        },
        areaServed: {
          "@type": "State",
          name: siteConfig.serviceArea.state,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          {
            "@type": "ListItem",
            position: 2,
            name: vertical.title,
            item: `${base}/${vertical.slug}`,
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

      <div className="mx-auto max-w-content px-5 pt-6 sm:px-8">
        <Breadcrumbs items={[{ href: `/${vertical.slug}`, label: vertical.title }]} />
      </div>

      {/* ------------------------------------------------------------- Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 pb-14 pt-6 sm:px-8 sm:pb-20">
          <div className="flex max-w-3xl flex-col gap-6">
            <span className="eyebrow">
              {siteConfig.serviceArea.description} &middot; {vertical.title}
            </span>
            <h1 className="text-display-1 font-display text-ink">{vertical.h1}</h1>
            <p className="max-w-measure text-body-lg text-ink-muted">
              {vertical.intro}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={plannerHref} size="lg">
                Start planning
              </ButtonLink>
              <p className="text-small text-ink-muted">
                A real reply within {slaHours} hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- What we do */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <Reveal as="h2" className="text-display-2 font-display text-ink">
            What we take on
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {vertical.includes.map((item, index) => (
              <Reveal
                key={item.heading}
                delayMs={index * 60}
                className="flex flex-col gap-2 rounded-xl border border-line bg-paper-raised p-6"
              >
                <h3 className="font-display text-heading-2 text-ink">
                  {item.heading}
                </h3>
                <p className="text-small text-ink-muted">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Objection */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-display-2 font-display text-ink">
                {vertical.objection.heading}
              </h2>
              <p className="text-body-lg text-ink-muted">
                {vertical.objection.body}
              </p>
            </Reveal>

            <Reveal className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
              <h3 className="font-display text-heading-2 text-ink">
                What stays yours
              </h3>
              <ul className="flex flex-col gap-3 text-small text-ink-muted">
                {vertical.yourPart.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-px w-3 shrink-0 bg-line-strong"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Closing CTA */}
      <section>
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <Reveal className="flex max-w-measure flex-col gap-5">
            <h2 className="text-display-2 font-display text-ink">
              {vertical.ctaHeading}
            </h2>
            <p className="text-body-lg text-ink-muted">{vertical.ctaBody}</p>
            <div>
              <ButtonLink href={plannerHref} size="lg">
                Start planning
              </ButtonLink>
            </div>
            <p className="text-small text-ink-muted">
              Planning something else?{" "}
              {VERTICALS.filter((v) => v.slug !== vertical.slug).map((v, i, arr) => (
                <span key={v.slug}>
                  <Link
                    href={`/${v.slug}`}
                    className="underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                  >
                    {v.title.toLowerCase()}
                  </Link>
                  {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " or " : "."}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      <StickyCta />
    </>
  );
}
