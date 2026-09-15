import type { EventTypeValue } from "@/lib/domain/inquiry-options";

/**
 * The four verticals, and the copy that belongs to each.
 *
 * WRITTEN, NOT TEMPLATED. Every string below is specific to its vertical. The
 * structure repeats because the pages serve the same job; the content does not,
 * because four pages built by substituting a noun into one paragraph is the
 * doorway-page pattern CLAUDE.md forbids. If a field here could be swapped
 * between two verticals without anyone noticing, it is not finished.
 *
 * TRANSPORTATION COPY RULE. Allowed verbs with "we" as subject: coordinate,
 * arrange, manage, source, schedule. Forbidden: provide, offer, operate, run,
 * drive, supply. Never "our fleet", "our vehicles", "our drivers". CGS 13b-101
 * turns on whether a business represents itself as being in the business of
 * transporting passengers for hire, and the trigger is advertising conduct
 * rather than ownership. See docs/DECISIONS.md D-013.
 */

export type Vertical = {
  slug: string;
  /** Maps to the planner's step-1 answer, so the CTA can preselect it. */
  eventType: EventTypeValue;
  title: string;
  /** Homepage card. */
  homeBlurb: string;
  homeLink: string;
  /**
   * Kept short on purpose: the root layout appends " | New England Event
   * Planners", and the page-contract check fails a title over 65 characters
   * because Google truncates around there.
   */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  /**
   * Standfirst for the "What we take on" section. Written per vertical, like
   * everything else here: a sentence that would read correctly on two of these
   * pages is a sentence that belongs on neither.
   */
  includesLede: string;
  /** What the engagement actually covers. */
  includes: { heading: string; body: string }[];
  /** The objection this buyer actually has, answered rather than dodged. */
  objection: { heading: string; body: string };
  /** What the customer still owns. Honesty here prevents a bad engagement. */
  yourPart: string[];
  ctaHeading: string;
  ctaBody: string;
};

export const VERTICALS: Vertical[] = [
  {
    slug: "weddings",
    eventType: "wedding",
    title: "Weddings",
    homeBlurb:
      "Ceremony, reception, and the weekend around it — including the guest logistics nobody warns you about.",
    homeLink: "Wedding planning",
    metaTitle: "Connecticut Wedding Planning",
    metaDescription:
      "Connecticut wedding planning and day-of coordination: venue sourcing, vendor vetting, timeline, and the guest logistics most couples find out about too late.",
    h1: "Connecticut wedding planning, without the second full-time job.",
    intro:
      "A Connecticut wedding is roughly a dozen separate contracts, four of which you will only discover you needed in month nine. We hold all of them, so the planning stops being a project you manage after work.",
    includesLede:
      "A wedding is a dozen contracts, one date, and no second attempt. These are the four places that decide whether the day runs.",
    includes: [
      {
        heading: "Venue sourcing that accounts for the constraints",
        body:
          "Capacity is the easy number. What actually decides a venue is the parking count against your guest list, whether the town's noise ordinance ends your reception before the venue's own curfew does, whether the caterer list is mandatory or merely recommended, and what happens if it rains. We shortlist against those, not against photographs.",
      },
      {
        heading: "Vendor sourcing and vetting",
        body:
          "Caterers, florists, photographers, entertainment, rentals. We bring you options that fit the venue's actual policies and your budget band, and we read the contracts before you sign them.",
      },
      {
        heading: "Timeline and run-of-show",
        body:
          "A document every vendor works from, built backwards from the last dance. It is the difference between a photographer who knows when the light goes and one who asks you during cocktail hour.",
      },
      {
        heading: "Guest transportation, coordinated",
        body:
          "Shuttles between hotel blocks and a venue with thirty parking spaces are a scheduling problem with a legal wrapper. We arrange and schedule it through independent licensed and insured carriers, confirm the staging area works for the vehicle size, and hold the timings. We do not own vehicles or employ drivers, and your transportation contract is directly with the carrier.",
      },
    ],
    objection: {
      heading: "\"Can't the venue coordinator do this?\"",
      body:
        "A venue coordinator works for the venue. They make sure the room is set, the kitchen runs on time, and the building closes when it should — and they are good at it. What they do not do is tell you the florist is overcharging, chase the band's rider, or decide what happens when the shuttle is late. Those are the jobs that land on the couple, and they are the ones we take.",
    },
    yourPart: [
      "Every decision that is actually about taste stays yours. We narrow, you choose.",
      "You sign your own vendor contracts. We read them first and tell you what to change.",
      "If you want to run part of it yourself, say so and we will scope around it rather than charging you for work you are going to do anyway.",
    ],
    ctaHeading: "Tell us the date and the part you are dreading.",
    ctaBody:
      "You do not need a venue, a guest list, or a budget spreadsheet yet. A rough date and a rough number is enough for a useful first answer.",
  },
  {
    slug: "corporate-events",
    eventType: "corporate",
    title: "Corporate events",
    homeBlurb:
      "Holiday parties, offsites, conferences, product launches and fundraisers — one point of accountability and one invoice.",
    homeLink: "Corporate events",
    metaTitle: "Connecticut Corporate Event Planning",
    metaDescription:
      "Corporate event planning across Connecticut: holiday parties, offsites, conferences, product launches and fundraisers. One point of accountability, vetted vendors, and invoicing that fits procurement.",
    h1: "Corporate events in Connecticut, with one person accountable.",
    intro:
      "The problem with a company event is rarely the event. It is that organising it lands on someone whose actual job is something else, and who now owns nine vendor relationships and a procurement process that was not designed for any of them. A launch, a fundraiser and a holiday party are different evenings with the same underlying problem.",
    includesLede:
      "Everything below is work that would otherwise sit on top of someone's actual job, usually in the six weeks before the date.",
    includes: [
      {
        heading: "One point of accountability",
        body:
          "You get a person, not a queue. When the AV company and the caterer disagree about load-in, that is our problem to resolve, and you find out it happened afterwards rather than during.",
      },
      {
        heading: "Venue sourcing across the Connecticut corridors",
        body:
          "Greater Hartford, the Fairfield County corridor, and Greater New Haven have genuinely different inventory and genuinely different weekday availability. We source against headcount, AV requirements, parking, and how far your people are actually willing to drive on a Tuesday.",
      },
      {
        heading: "Production and AV coordination",
        body:
          "Staging, sound, lighting, screens, and the run-of-show that ties them to your agenda. Sourced and scheduled through vetted independent providers, with the technical requirements agreed before anyone quotes.",
      },
      {
        heading: "Invoicing that survives procurement",
        body:
          "Clear scope, clear line items, and documentation your finance team will accept. Vendor costs are itemised where you want them itemised.",
      },
    ],
    objection: {
      heading: "\"We have done this in-house for years.\"",
      body:
        "Then you already know the real cost, which is not the venue deposit. It is the six weeks of someone senior's attention, and the fact that all of the vendor knowledge leaves when they do. We are not arguing your team cannot do it. We are arguing that it is an expensive way to spend them.",
    },
    yourPart: [
      "You own the agenda and the message. We own everything that has to happen for it to land.",
      "Approvals stay with you. We will tell you the deadline each one is against.",
      "Internal comms to your own people stay in your hands — they should hear it from you.",
    ],
    ctaHeading: "Give us a headcount and a window.",
    ctaBody:
      "Even a rough date range and an approximate number is enough to come back with venue options and what they would realistically cost.",
  },
  {
    slug: "private-events",
    eventType: "private",
    title: "Private events",
    homeBlurb:
      "Milestone birthdays, anniversaries, graduations, parties with a guest list — the ones that matter without being a wedding.",
    homeLink: "Private events",
    metaTitle: "Connecticut Milestone Events",
    metaDescription:
      "Planning for Connecticut milestone birthdays, anniversaries, graduations, parties and family celebrations. Real help on a real budget, with the scope set to what you actually need.",
    h1: "The party you want to be at, not the one you are running.",
    intro:
      "Milestone events get planned by the person they are least fun for. A sixtieth, a fiftieth anniversary, a graduation, a party big enough to need a plan — someone in the family ends up holding the caterer, the rentals and the seating chart, and spends the evening checking on things instead of being at them.",
    includesLede:
      "Milestone events are small enough to look easy and complicated enough to eat a month. This is the part we take off you.",
    includes: [
      {
        heading: "Scope set to your budget, not the other way round",
        body:
          "Most private events do not need full planning, and we will say so. Often the useful version is venue sourcing plus someone running the day, and the rest stays with you. That is a real option here, not an upsell path.",
      },
      {
        heading: "Venue and vendor sourcing",
        body:
          "Restaurants with private rooms, halls, clubs, and homes that need the whole infrastructure brought in. We know which ones let you bring your own caterer and which ones absolutely do not.",
      },
      {
        heading: "Rentals, and the things people forget",
        body:
          "Tables, linens, glassware, heaters, lighting, power. The list that nobody thinks about until the week before, when the good stock is gone.",
      },
      {
        heading: "Someone running the actual day",
        body:
          "So the person whose event it is, or whose parent it is, gets to be a guest at it. This is the part people tell us afterwards mattered most.",
      },
    ],
    objection: {
      heading: "\"Isn't a planner overkill for sixty people?\"",
      body:
        "Often, yes — and we will tell you when it is. Sixty people in a restaurant's private room does not need us. Sixty people in a tent in your garden, with a caterer, a bar, rented everything and a generator, absolutely does. The number of guests is not what decides it; the number of moving parts is.",
    },
    yourPart: [
      "The guest list and the tone are yours. We are not going to tell you what your mother's eightieth should feel like.",
      "If the budget is fixed and tight, say so on the form. It changes what we recommend, and we would rather know first.",
    ],
    ctaHeading: "Tell us what the occasion is.",
    ctaBody:
      "And roughly how many people. We will come back with what we would actually do, including if the honest answer is that you do not need us.",
  },
  {
    slug: "venue-vendor-coordination",
    eventType: "coordination",
    title: "Venue & vendor coordination",
    homeBlurb:
      "You have the vision and the vendors. You want someone to run the logistics and hold the timeline.",
    homeLink: "Coordination only",
    metaTitle: "Connecticut Event Coordination",
    metaDescription:
      "Coordination-only support for Connecticut events: venue sourcing, vendor management, run-of-show and day-of execution, for people who have the vision and want the logistics handled.",
    h1: "You have the vision. We run the logistics.",
    intro:
      "Some people do not want a planner. They know exactly what they want, they have picked most of it, and what they actually need is someone to make the pieces arrive in the right order and deal with it when one of them does not.",
    includesLede:
      "You have already made the decisions. This is the execution layer that sits under them, from the first site visit to the last van leaving.",
    includes: [
      {
        heading: "Venue sourcing, on your brief",
        body:
          "You tell us the constraints that matter. We come back with options that clear them, with the parking, curfew, catering policy and wet-weather plan stated up front rather than discovered on a site visit.",
      },
      {
        heading: "Vendor management",
        body:
          "We take over the threads you have already started. Confirming, chasing, checking the contracts line up with each other, and making sure two vendors have not both assumed the other is bringing the power.",
      },
      {
        heading: "Run-of-show",
        body:
          "One document, built backwards from the end of the night, that every vendor works from. It is the single highest-leverage thing in coordination and the most commonly missing.",
      },
      {
        heading: "The day itself",
        body:
          "We are there, running it. Load-in, timings, the thing that goes wrong, and the part where somebody has to make a decision quickly without asking you.",
      },
    ],
    objection: {
      heading: "\"I have already booked most of it. Is it too late?\"",
      body:
        "No — this is the most common way people come to us, and it is a completely reasonable place to start. What we need is your contracts and your vendor list. What we usually find in them is two timing conflicts and one assumption nobody has checked.",
    },
    yourPart: [
      "Every choice you have already made stays made. We are not going to relitigate your florist.",
      "You keep your vendor relationships. We work alongside them, not over them.",
      "If we think something you have booked is going to cause a problem, we will say so once, clearly, and then work with what you decide.",
    ],
    ctaHeading: "Send us what you have already got.",
    ctaBody:
      "Venue, date, and whichever vendors are booked. We will tell you what is missing and what we would take off your hands.",
  },
];

export function verticalBySlug(slug: string): Vertical | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

export const VERTICAL_SLUGS = VERTICALS.map((v) => v.slug);
