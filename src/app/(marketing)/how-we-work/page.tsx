import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { RuledItem, RuledList } from "@/components/sections/ruled-list";
import { Fact, FactList } from "@/components/sections/fact-list";
import { DocumentSample } from "@/components/sections/document-sample";
import { StickyCta } from "@/components/site/sticky-cta";
import { responseSlaHours, siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "How we work",
  description:
    "What actually happens after you submit the form: the response commitment, how we select and check vendors, what we do not claim, and what you own.",
  alternates: { canonical: "/how-we-work" },
};

/**
 * The process page.
 *
 * VENDOR VETTING IS LEGALLY LOAD-BEARING. Publishing "we verify insurance and
 * licensing" converts a marketing line into a performance promise with two
 * independent failure modes: the voluntary undertaking doctrine plus negligent
 * selection, and CUTPA deception if the check is not actually performed. So
 * this page states only what is genuinely done today, in the present tense, and
 * says plainly where the standard is still being built. See docs/DECISIONS.md
 * D-013 and docs/TRUST_STRATEGY.md before changing a word of the vetting
 * section.
 *
 * Laid out in sections rather than as one prose column. This page is read by
 * someone deciding whether to trust the company, and a wall of undifferentiated
 * paragraphs buries the two passages that do the persuading - the enforced
 * response deadline and the "what we do not claim" paragraph.
 */
export default function HowWeWorkPage() {
  const slaHours = responseSlaHours();
  const base = siteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: "How we work",
        item: `${base}/how-we-work`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHeader
        eyebrow="Process"
        title="What actually happens after you submit the form."
        standfirst="No discovery call you have to sit through before anyone tells you anything useful. Here is the whole sequence, including the parts that cost us bookings."
        crumb={{ href: "/how-we-work", label: "How we work" }}
        aside={
          <FactList>
            <Fact term="Deadline">
              {slaHours} hours from the moment your form saves, stored against
              the inquiry rather than promised in copy.
            </Fact>
            <Fact term="Stops it">
              A reply from a person. Opening your inquiry does not; anything past
              the deadline is flagged internally until it is answered.
            </Fact>
            <Fact term="Costs you">
              Nothing, and no obligation. Asking is not a commitment and it does
              not put you in a sequence.
            </Fact>
          </FactList>
        }
      />

      {/* ------------------------------------------------------ The four stages */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="The four stages"
            lede="Start to finish, with the point at which we would tell you we are not the right fit marked clearly, because it is stage two rather than stage never."
          />
          <div className="mt-10 sm:mt-12">
            <RuledList as="ol">
              <RuledItem as="li" index="01" heading="Inquiry">
                Five questions, about ninety seconds. We save your answers as you
                go, so a dropped connection does not cost you the form.
              </RuledItem>
              <RuledItem
                as="li"
                index="02"
                heading={`First reply, within ${slaHours} hours`}
                delayMs={60}
              >
                What we would do, roughly what it involves, and the questions we
                would need answered next. If we are not the right fit, this is
                where we say so.
              </RuledItem>
              <RuledItem as="li" index="03" heading="Scoping" delayMs={120}>
                We agree what we are running and what you are keeping. This is
                written down before any money moves, because &ldquo;I thought you
                were handling that&rdquo; is the failure mode that ruins events.
              </RuledItem>
              <RuledItem as="li" index="04" heading="Delivery" delayMs={180}>
                We source, we coordinate, we hold the timeline, and we are there
                on the day.
              </RuledItem>
            </RuledList>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Vendor selection */}
      <section className="border-b border-line bg-paper-sunk">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="How we select vendors"
            lede="The vetting is the value. A customer who cannot judge a caterer can judge whether the person recommending one has a standard."
          />

          <div className="mt-10 grid gap-10 sm:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <Reveal className="flex max-w-measure flex-col gap-5">
              <p className="text-body text-ink-muted">
                Here is ours, stated honestly at the stage it is actually at. We
                are a new company, and our vendor file is being built rather
                than inherited. What we do today, on every provider we put in
                front of you:
              </p>
              <ul className="flex flex-col gap-3 text-body text-ink-muted">
                <Check>
                  We confirm the provider is a real operating business,
                  reachable at a real address, before we recommend them.
                </Check>
                <Check>
                  We read the contract they intend you to sign, and we tell you
                  what we would change in it.
                </Check>
                <Check>
                  We check their terms against the venue&apos;s own policies,
                  because the conflict between those two documents is where most
                  event problems actually start.
                </Check>
                <Check>
                  Where a provider operates in a licensed category —
                  transportation being the obvious one — we ask for their licence
                  and certificate of insurance, and we record what we were shown
                  and when.
                </Check>
              </ul>
            </Reveal>

            {/*
              This card is legally load-bearing, not a design flourish. Claiming
              a "fully vetted network" is a performance promise with two
              independent failure modes, so the refusal to claim it is given the
              same visual weight as the list of checks that are real.
            */}
            <Reveal className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
              <h3 className="font-display text-heading-2 text-ink">
                What we do not claim
              </h3>
              <p className="text-small text-ink-muted">
                We do not describe ourselves as having &ldquo;fully
                vetted&rdquo; a network we are still building, and we will not
                publish a vetting badge until there is a documented file behind
                every provider it covers.
              </p>
              <p className="text-small text-ink-muted">
                If a specific check matters to you, ask us what we did and we
                will tell you exactly what we have on file.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/*
        ------------------------------------------------------- The machinery

        Every site in this category is a gallery of flowers. What a client is
        actually buying is the documentation underneath - and unlike
        photography, we can show it honestly on day one, because these are our
        own templates rather than evidence of an event we have not run. The
        caption on each one says so on its face.
      */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="The paperwork nobody shows you"
            lede="Three of the documents an event actually runs on. They are the difference between a plan and a wish, and they are the part of this work a photograph cannot show."
          />

          <div className="mt-10 flex flex-col gap-12 sm:mt-12">
            <DocumentSample
              title="Run of show"
              caption="Our template. Built backwards from the last dance, and every vendor works from the same copy."
              columns={[
                { key: "time", label: "Time", numeric: true },
                { key: "what", label: "What happens" },
                { key: "who", label: "Who is responsible" },
                { key: "watch", label: "What goes wrong here" },
              ]}
              rows={[
                {
                  time: "14:00",
                  what: "Vendor load-in opens",
                  who: "Us, on site",
                  watch: "Two vans arrive at once and the loading door fits one",
                },
                {
                  time: "16:30",
                  what: "Room flip begins",
                  who: "Venue + rentals",
                  watch: "Ceremony chairs are the reception chairs; nobody costed the labour",
                },
                {
                  time: "17:15",
                  what: "Photography golden hour",
                  who: "Photographer",
                  watch: "Sunset moved three weeks ago and the timeline did not",
                },
                {
                  time: "22:45",
                  what: "Amplified music ends",
                  who: "Band / DJ",
                  watch: "Town ordinance, not the venue's curfew — the earlier of the two wins",
                },
                {
                  time: "23:30",
                  what: "Load-out complete",
                  who: "All vendors",
                  watch: "Overtime starts at midnight and somebody has to be there to sign",
                },
              ]}
              footnote="Times are illustrative. Every event gets its own, built from its own venue constraints."
            />

            <DocumentSample
              title="Vendor status"
              caption="Our template. What is signed, what is outstanding, and what is blocking something else."
              columns={[
                { key: "role", label: "Role" },
                { key: "status", label: "Status" },
                { key: "owes", label: "Outstanding" },
                { key: "by", label: "Needed by", numeric: true },
              ]}
              rows={[
                { role: "Venue", status: "Signed", owes: "Floor plan with final table count", by: "T-30" },
                { role: "Caterer", status: "Signed", owes: "Final headcount, dietary list", by: "T-14" },
                { role: "Rentals", status: "Quoted", owes: "Confirm delivery window vs. load-in", by: "T-21" },
                { role: "Photography", status: "Signed", owes: "Shot list, family groupings", by: "T-7" },
                { role: "Transportation", status: "Quoted", owes: "Carrier licence and certificate of insurance on file", by: "T-21" },
              ]}
              footnote="Transportation is coordinated through independent licensed and insured carriers; the contract is between the client and the carrier."
            />

            <DocumentSample
              title="Load-in and access"
              caption="Our template. The constraints that decide whether a plan is physically possible."
              columns={[
                { key: "item", label: "Constraint" },
                { key: "value", label: "What we confirm" },
              ]}
              rows={[
                { item: "Access", value: "Door width, stair or lift, distance from the nearest unloading point" },
                { item: "Window", value: "Earliest load-in and latest load-out the venue will actually allow" },
                { item: "Parking", value: "On-site count against guest count, and whether overflow exists" },
                { item: "Staging", value: "Whether the approach takes the vehicle size the guest count implies" },
                { item: "Power", value: "Circuits available where the band, the lighting and the caterer all need them" },
                { item: "Weather", value: "The call time for the contingency, and who makes the call" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* -------------------------------------------- Coordinate vs. operate */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <SectionHeader
            title="What we coordinate, and what we do not operate"
            lede="The distinction is real rather than a disclaimer, and it changes who you have a contract with."
          />
          <div className="mt-10 sm:mt-12">
            <RuledList>
              <RuledItem heading="We hold the relationship and the coordination">
                {siteConfig.name} is your single point of contact and the party
                accountable for the plan. The work itself — catering, florals,
                photography, rentals, production, transportation — is delivered
                by independent providers.
              </RuledItem>
              <RuledItem heading="We are not a transportation operator" delayMs={60}>
                We do not own vehicles or employ drivers. Where an event needs
                transportation, we arrange and schedule it through independent
                licensed and insured carriers, and your transportation contract
                is directly with the carrier.
              </RuledItem>
            </RuledList>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- What you keep + CTA */}
      <section>
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <Reveal className="flex max-w-measure flex-col gap-5">
              <h2 className="text-display-2 font-display text-ink">
                What stays yours, start to finish.
              </h2>
              <ul className="flex flex-col gap-3 text-body text-ink-muted">
                <Check>Every decision that is actually about taste.</Check>
                <Check>
                  Your own vendor contracts. We read them first and tell you what
                  to change; we do not sign on your behalf.
                </Check>
                <Check>
                  The right to take part of it back. If you decide to run
                  something yourself, we will rescope rather than bill you for
                  work you are doing.
                </Check>
              </ul>
              <div className="mt-1">
                <ButtonLink href="/plan" size="lg">
                  Start planning
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal className="flex h-fit flex-col gap-2 border-t border-line pt-4 lg:pt-6">
              <span className="eyebrow text-ink-subtle">Where we work</span>
              <p className="text-small text-ink-muted">
                {siteConfig.serviceArea.state}. If your event is elsewhere in New
                England, tell us on the form and we will be straight with you
                about whether we can help — which quite often means pointing you
                at someone local who can.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <StickyCta />
    </>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-line-strong" />
      <span>{children}</span>
    </li>
  );
}
