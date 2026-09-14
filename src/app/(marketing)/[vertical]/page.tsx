import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { StickyCta } from "@/components/site/sticky-cta";
import { SlotImage, hasSlotImage, slotAspectClass } from "@/components/site/slot-image";
import type { ImageSlotName } from "@/lib/images";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeader } from "@/components/sections/section-header";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
import { Fact, FactList } from "@/components/sections/fact-list";
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
  const heroSlot = `hero-${vertical.slug}` as ImageSlotName;
  const hasHero = hasSlotImage(heroSlot);

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
      {/*
        The same masthead as the homepage: headline across the full measure, a
        rule, then the argument on the left and the reference column on the
        right. What fills that right column is the only thing that varies - the
        photograph when the slot has one, the standing facts when it does not.
        One layout either way, so the page is never designed around an image
        that has not arrived.
      */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 pb-14 pt-4 sm:px-8 sm:pb-20">
          <span className="eyebrow">
            {siteConfig.serviceArea.description} &middot; {vertical.title}
          </span>
          <h1 className="mt-5 max-w-[19ch] text-display-1 font-display text-ink">
            {vertical.h1}
          </h1>

          <div className="mt-10 grid gap-10 border-t border-line pt-8 sm:mt-12 sm:pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="flex max-w-measure flex-col gap-6">
              <p className="text-body-lg text-ink-muted">{vertical.intro}</p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <ButtonLink href={plannerHref} size="lg">
                  Start planning
                </ButtonLink>
                <p className="text-small text-ink-muted">
                  A real reply within {slaHours} hours.
                </p>
              </div>
            </div>

            {hasHero ? (
              <SlotImage
                name={heroSlot}
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className={`w-full rounded-xl object-cover ${slotAspectClass(heroSlot)}`}
              />
            ) : (
              <FactList>
                <Fact term="Where">
                  {siteConfig.serviceArea.state} only. If your event is
                  elsewhere we will say so rather than take the booking.
                </Fact>
                <Fact term="Scope">{vertical.homeBlurb}</Fact>
                <Fact term="Reply">
                  Within {slaHours} hours, written by a person who read what you
                  sent.
                </Fact>
              </FactList>
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- What we do */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="What we take on"
            lede={vertical.includesLede}
          />
          <div className="mt-10 sm:mt-12">
            <RuledList>
              {vertical.includes.map((item, index) => (
                <RuledItem
                  key={item.heading}
                  heading={item.heading}
                  delayMs={index * 60}
                >
                  {item.body}
                </RuledItem>
              ))}
            </RuledList>
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

            <Reveal className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
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
          <Reveal className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-16">
            <div className="flex max-w-measure flex-col gap-4">
              <h2 className="text-display-2 font-display text-ink">
                {vertical.ctaHeading}
              </h2>
              <p className="text-body-lg text-ink-muted">{vertical.ctaBody}</p>
              <div className="mt-1">
                <ButtonLink href={plannerHref} size="lg">
                  Start planning
                </ButtonLink>
              </div>
            </div>
            {/*
              The other three pillars, as a ruled index rather than a sentence
              of commas. A visitor who has read to the bottom of the wrong page
              is one click from the right one, and it gives every pillar three
              inbound links from indexed content instead of leaving the weakest
              of the four an orphan.
            */}
            <nav aria-label="Other services" className="lg:pt-2">
              <span className="eyebrow text-ink-subtle">Planning something else?</span>
              <ul className="mt-3 flex flex-col border-t border-line">
                {VERTICALS.filter((v) => v.slug !== vertical.slug).map((other) => (
                  <li key={other.slug} className="border-b border-line">
                    <Link
                      href={`/${other.slug}`}
                      className="flex items-center justify-between gap-4 py-3 text-small text-ink transition-colors duration-150 hover:text-accent"
                    >
                      {other.title}
                      <span aria-hidden="true" className="text-ink-subtle">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>
        </div>
      </section>

      <StickyCta />
    </>
  );
}
