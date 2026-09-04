# Project specification

## The company

**New England Event Planners LLC**, trading as New England Event Planners,
newenglandeventplanners.com. A Connecticut-first event services company that
owns the customer relationship and coordinates fulfilment through internally
vetted third-party providers.

**Positioning.** One place to start planning an event, instead of separately
hunting down and coordinating every vendor yourself.

**Starting position.** Zero traffic, zero domain authority, zero completed
events, zero reviews, zero case studies, zero vendors on file. Designed around,
not hidden.

## Scope — exactly four verticals

1. **Weddings** — ceremony, reception, and the weekend around it
2. **Corporate events** — holiday parties, offsites, conferences, client events
3. **Private events** — milestone birthdays, anniversaries, graduations
4. **Venue and vendor coordination** — logistics for a customer who has the
   vision and wants someone to run it

Build order is weddings + venue coordination, then private, then corporate.
Reasoning in `docs/DECISIONS.md` D-015.

## Explicit non-scope

**Transportation as a marketed channel.** Transportation is a service the
company *fulfils inside* the four verticals. It is never an acquisition channel.
No standalone party bus, group transportation or general transportation landing
pages, in any form. Wedding shuttle logistics appear inside wedding content as
demonstrated competence only. This is a legal boundary — `docs/DECISIONS.md`
D-013.

**Other DBAs.** The legal entity holds other DBAs. They are unrelated brands
with different audiences on different domains. Never reference, link to, build
toward, or target their keywords. This site is standalone. The only connection
is the legal entity, surfacing only where legally required in terms, privacy and
contracts.

**Geography beyond Connecticut.** Architecture supports expansion to MA, RI, NH,
VT and ME. Public content must never imply current operations outside
Connecticut. Where a customer's event falls outside, the site says so plainly —
which is itself a trust signal.

## Customers

**Wedding couples.** Planning 12–18 months out, most acutely in September (peak
inquiry month). Deciding between doing it themselves, a full-service planner, or
day-of coordination. Primary fear: being sold to. Primary need: someone who has
seen the venue and knows the constraints.

**Corporate organisers.** Office managers, EAs, marketing and HR. Concentrated
in Greater Hartford (insurance and financial services), the Fairfield County
finance corridor, and Greater New Haven life sciences. Need reliability,
invoicing and a single point of accountability. Come from relationships, not
content.

**Private hosts.** Milestone events. Budget-conscious, timeline-compressed, and
want the day to feel handled.

## Business rules

**The response commitment is a system, not a slogan.** `RESPONSE_SLA_HOURS`
(default 24) is a single source of truth: it is published on the site, stored
per inquiry as `response_due_at`, and enforced by a visible overdue flag in
admin. Changing the number changes both sides at once. The clock stops only on
an explicit human action — opening a lead is not answering it.

**No lead may silently disappear.** A persistence failure shows the customer a
real error plus a direct contact route and logs an incident id. A notification
failure never rolls back a saved lead.

**We say when we are not a fit.** If the event is outside Connecticut, outside
the four verticals, or beyond what the company can do well, the site and the
first reply say so and point elsewhere. This costs bookings and buys the only
reputation a new company can actually build.

**We coordinate; we do not operate.** The company holds the customer
relationship and the coordination. The work — catering, florals, photography,
rentals, production, transportation — is delivered by independent providers.
Transportation contracts are between the customer and the carrier.

## Success measures

**Phase 1 is about proving the machine works, not volume.**

- Every inquiry answered within the published commitment, measured, not assumed
- Zero lost leads (persistence failures logged and reconciled)
- Share of inquiries with a resolvable first-touch source
- Inquiry rate per page type, with venue pages measured against site average
- Rankings in the venue-guide and cost corridors — **not** the service head
  terms, which are aggregator-locked at zero authority

**Deliberately not measured in Phase 1:** total traffic. At zero authority it is
a vanity number that would encourage the wrong content.

## Constraints inherited by every decision

1. No fabrication, of anything, ever
2. Transportation honesty, in the specific statutory sense of not representing
   the company as being in the business of transporting passengers for hire
3. Evidence classes on every research conclusion in documentation
4. Connecticut only in public content
5. No doorway pages

These are in `CLAUDE.md` because they load on every turn.
