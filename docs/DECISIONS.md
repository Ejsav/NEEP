# Decision log

Format per entry: **Decision / Evidence / Alternatives / Reason chosen / Risk /
How measured / Revisit condition.**

Evidence classes, used throughout: **VERIFIED FACT** (first-party or
authoritative source), **RESEARCH OBSERVATION** (secondary source or SERP),
**STRATEGIC INFERENCE** (reasoning from those), **RECOMMENDATION**.

> **Research limitation affecting this whole document.** During the Session 1
> research pass, this environment's egress policy blocked `developers.google.com`,
> `nextjs.org`, `react.dev`, `web.dev`, `fmcsa.dot.gov`, `cga.ct.gov`,
> `portal.ct.gov` and `ecfr.gov` at the proxy (HTTP 403). Findings sourced from
> those domains came from search-index extraction, not from reading the page.
> They are labelled RESEARCH OBSERVATION rather than VERIFIED FACT even where the
> underlying source is authoritative. Next.js findings were recovered from
> first-party docs shipped inside `node_modules/next/dist/docs/`, which is why
> they carry a higher confidence than the rest. **Re-verify anything marked
> UNVERIFIED before it drives a legal or public claim.**

---

## D-001 — Modular monolith on Next.js App Router

**Decision.** One Next.js 16 application: public marketing, venue database and
admin in a single deployable, separated by route group and module boundary
rather than by service.

**Evidence.** RESEARCH OBSERVATION: Next 16.3.4 is current stable (npm registry,
published 2026-08-31), engines `node >= 20.9`, Turbopack default for dev and
build. STRATEGIC INFERENCE: this site is overwhelmingly read-dominated, and the
write path is one form plus a small admin.

**Alternatives.** Separate marketing site + API service; a headless CMS with a
custom frontend; Astro for content with a separate app for admin.

**Reason chosen.** The expensive coupling in this product is between content and
conversion — a venue page is a lead capture surface. Splitting them across
services buys distributed-systems cost for no isolation benefit at this size. A
route-group boundary gives the same clarity at a fraction of the operational
weight.

**Risk.** The admin and the public site scale together and share a blast radius.

**How measured.** Build time, p75 LCP on public routes, admin response times.

**Revisit condition.** Admin grows past roughly ten screens with its own
non-trivial workflows, or the venue dataset needs a separate ingestion pipeline.

---

## D-002 — Drizzle ORM over Prisma

**Decision.** `drizzle-orm` 0.45 with the `postgres` (postgres.js) driver.

**Evidence.** RESEARCH OBSERVATION: Drizzle ships no query-engine binary;
Prisma 7 removed its Rust engine but the artifact remains larger. RESEARCH
OBSERVATION: `prisma@latest` currently resolves to `8.0.0-rc.12`, an RC, while
`@prisma/client@latest` is 7.10.0 — a naive install would pull a prerelease.

**Alternatives.** Prisma 7; Kysely; raw `postgres.js`.

**Reason chosen.** Postgres-native types matter here (JSONB service arrays,
enums, partial indexes on the venue schema to come), and Drizzle exposes them
directly. Cold-start size matters on a serverless target.

**Risk.** `drizzle-kit` migrations are less mature than `prisma migrate`, and
Drizzle's 0.x → 1.0 transition is still in RC, so a migration is coming.

**How measured.** Migration friction per schema change; cold start time.

**Revisit condition.** Drizzle 1.0 ships — plan the upgrade deliberately. Or
migrations become a recurring source of production incidents.

---

## D-003 — Server-side sessions with scrypt, not a managed auth provider

**Decision.** Own the admin auth: scrypt password hashing via `node:crypto`,
opaque session tokens stored as SHA-256 in Postgres, absolute (12h) and idle
(2h) expiry, `__Host-` cookie prefix in production.

**Evidence.** VERIFIED FACT: `lucia` is deprecated — every recent npm version
carries a `deprecated` field pointing at a migration guide, last publish
2024-10-20. RESEARCH OBSERVATION: `next-auth` `latest` is still 4.24.15 with v5
published only under the `beta` tag at 5.0.0-beta.32, i.e. v5 remains formally
beta. RESEARCH OBSERVATION: `better-auth` 1.7.2 and `@clerk/nextjs` 7.9.1 are
both actively maintained.

**Alternatives.** Better Auth; Clerk; Auth.js v5 beta.

**Reason chosen.** Two reasons. First, a managed provider needs an account and
API keys that do not exist yet, which would have made Slice 1 unverifiable in
this session — an unverifiable money path is worse than a self-hosted one.
Second, the requirement is genuinely small: a handful of internal users, no
social login, no MFA yet. Server-side sessions also give immediate revocation,
which matters because an admin session can read every customer's contact
details.

**Risk.** Hand-rolled auth is a classic source of subtle bugs. Mitigated by:
identical timing on the unknown-account path via a dummy hash, identical error
copy for wrong-password / unknown / deactivated, two-axis rate limiting, an
audit log, and tests covering each.

**How measured.** Audit log review; any auth-related finding in `/audit`.

**Revisit condition.** MFA, SSO, customer-facing accounts, or more than about
ten admin users. Then move to Better Auth or Clerk — the session table is
deliberately provider-shaped to make that a contained change.

---

## D-004 — scrypt rather than argon2id

**Decision.** Node's built-in `crypto.scrypt`, N=2^15, r=8, p=1, 64-byte output,
16-byte random salt, with `maxmem` raised to accommodate N.

**Evidence.** VERIFIED FACT: scrypt is RFC 7914 and memory-hard. VERIFIED FACT:
it is in the Node standard library, so it adds no dependency.

**Alternatives.** `@node-rs/argon2` (prebuilt native binaries); `bcrypt`.

**Reason chosen.** Argon2id is the stronger primitive, but it arrives as a
native module — a real deployment risk on serverless targets and a build-time
failure mode. scrypt at these parameters is comfortably adequate for a
small set of admin passwords, and it cannot fail to install.

**Risk.** Argon2id has better resistance to GPU/ASIC attack per unit of memory.

**How measured.** Hash verification latency; any auth finding in `/audit`.

**Revisit condition.** Customer-facing accounts, or the admin user count growing
enough that the password table becomes a worthwhile target. The stored hash
format is self-describing (`scrypt$N$r$p$salt$hash`), so a second algorithm can
be added and rehashed on next login without a migration.

---

## D-005 — Postgres-backed rate limiting

**Decision.** Fixed-window counters in a `rate_limit_buckets` table, keyed by
purpose. Per-IP and global limits on the inquiry form; per-IP and per-account
limits on admin login. Fails **open** on database error.

**Evidence.** RESEARCH OBSERVATION: the Next.js docs do not provide a
rate-limiting primitive; their guidance is to add your own check and to enable
host-level rate limiting as well. STRATEGIC INFERENCE: an in-process counter on
a serverless target resets on every cold start and is not shared between
instances, which makes it security theatre.

**Alternatives.** In-memory LRU; Upstash Redis; host/WAF rate limiting only.

**Reason chosen.** Postgres is already a hard dependency, so this adds no new
infrastructure and the limit actually holds across instances and restarts.

**Risk.** A fixed window permits up to 2× the limit across a boundary. Accepted:
limits are set low enough that 2× is still harmless. Each check also costs one
write. Failing open is a deliberate trade — a database outage must not silently
drop a lead, and the persistence path has its own error handling.

**How measured.** Bucket table growth; spam volume reaching the inbox.

**Revisit condition.** Spam gets through despite the limits, the table becomes
hot enough to matter, or a WAF is added in front (then reconsider the layering).

---

## D-006 — Server Action for the inquiry form, not a Route Handler

**Decision.** `submitInquiry` is a Server Action consumed via `useActionState`.

**Evidence.** RESEARCH OBSERVATION, from Next's own docs shipped in
`node_modules`: *"Server Components support progressive enhancement by default,
meaning forms that call Server Actions will be submitted even if JavaScript
hasn't loaded yet or is disabled."* And, on security: *"the route is reachable to
anyone who can send the same POST. Treat every action as an untrusted entry
point."* VERIFIED FACT (observed in this build): a `"use server"` module may only
export async functions — constants and types must live in a sibling module.

**Alternatives.** Route Handler with a plain HTML form post; client `fetch` to
an API route.

**Reason chosen.** Errors re-render inline in a single roundtrip with no
redirect dance, `pending` comes free, and the no-JS path works without writing a
second implementation. The `use client` boundary stays scoped to the form, so
the surrounding page ships no JavaScript.

**Risk.** The action is a public endpoint. Mitigated by doing rate limiting,
signed-token verification and validation inside the action, in that order.

**How measured.** Submission success rate; spam rate; the no-JS check in
`pnpm verify:e2e`.

**Revisit condition.** A third party needs to POST to the form, or submissions
need to run in parallel from the client — actions are dispatched sequentially
per client, so a Route Handler would be correct there.

---

## D-007 — Cookie-based, server-set attribution

**Decision.** Attribution is captured in `src/proxy.ts` and written to three
HttpOnly first-party cookies: `neep_ft` (first touch, 1 year, never
overwritten), `neep_lt` (last touch, 90 days, overwritten only by a
campaign-bearing visit) and `neep_v` (opaque visit id and count).

**Evidence.** VERIFIED FACT: Next 16 renamed the `middleware` file convention to
`proxy`, and the build emits a deprecation warning for the old name — confirmed
in `node_modules/next/dist/build/index.js` and the shipped docs. STRATEGIC
INFERENCE: server-set cookies survive content blockers and work with JavaScript
disabled, unlike a client analytics script.

**Alternatives.** Client-side script writing `localStorage`; a third-party
analytics SDK; last-touch only.

**Reason chosen.** Attribution that only works when a tag manager loads is
attribution that under-reports exactly the privacy-conscious, ad-blocking
segment. Doing it at the edge is more accurate and touches no third party. The
last-touch overwrite rule — a later direct visit does **not** erase the campaign
that drove the visitor — is standard practice and is what makes paid spend
measurable.

**Risk.** Cookies are HttpOnly but **not signed**, so a determined visitor could
corrupt their own attribution record. Accepted: the blast radius is one row of
marketing data. Every field is therefore re-validated on read — type-checked,
control characters stripped, length-capped — rather than trusted. Signing would
force the proxy onto the Node runtime for a disproportionate gain.

**How measured.** Share of inquiries with a resolvable source; agreement with ad
platform click counts.

**Revisit condition.** Evidence of deliberate attribution tampering, or a need
to attribute revenue precisely enough that integrity matters more than runtime
flexibility.

---

## D-008 — Inquiry committed before attribution, deliberately not one transaction

**Decision.** `createInquiry` inserts the inquiry and commits, then inserts
attribution separately. An attribution failure is logged and reported as
`attributionCaptured: false`; it never raises.

**Evidence.** STRATEGIC INFERENCE. The foreign key points from attribution to
inquiry, so the dangerous orphan — attribution referencing an inquiry that never
committed — is structurally impossible in this order.

**Alternatives.** Both writes in one transaction.

**Reason chosen.** The lead is the asset; attribution is reporting metadata.
Wrapping them together means a marketing-data failure can roll back a real
customer's submission, which inverts the priorities. This was caught and
corrected during the build: the first implementation used a transaction whose
`catch` re-threw, contradicting its own comment.

**Risk.** An inquiry can exist with no attribution row. The admin detail page
states this plainly rather than rendering blanks.

**How measured.** Count of inquiries with a null attribution row.

**Revisit condition.** Attribution loss stops being rare.

---

## D-009 — Notification outbox with an honest unconfigured state

**Decision.** Every notification is written to the `notifications` table
**before** any delivery attempt, then updated with the outcome. Delivery goes
through Resend via `fetch` when `RESEND_API_KEY` and `EMAIL_FROM` are both set.
Otherwise the row is stored with status `no_provider` and the admin UI says, in
those words, that no email was sent.

**Evidence.** STRATEGIC INFERENCE, constrained by the no-fabrication rule.

**Alternatives.** Send inline and hope; a queue (BullMQ/QStash); a mock
transport that logs success.

**Reason chosen.** A mock transport reporting success would be a fake dashboard
— explicitly forbidden. The outbox means a provider outage can never make a lead
invisible, and the dashboard tells the operator the truth about their own
configuration. No SDK dependency: Resend's REST API over `fetch` is enough.

**Risk.** No automatic retry yet. Failed rows sit visible in admin until a retry
slice ships.

**How measured.** Notification rows by status; time from submission to first
human response.

**Revisit condition.** Delivery failures become common, or volume justifies a
real queue with backoff.

---

## D-010 — TypeScript 5.9 and ESLint 9, both pinned below latest

**Decision.** `typescript@5.9.3` and `eslint@^9.39.5`, despite TypeScript 7.0.2
and ESLint 10.9.1 being the current `latest`.

**Evidence.** VERIFIED FACT, both observed directly in this build:

- `typescript-eslint@8.69.0` refuses to load under TS 7: *"typescript-eslint does
  not support TS 7.0"*, pointing at tracking issue #10940. TS 7 typechecked the
  project cleanly; only the linter breaks.
- Under ESLint 10, `eslint-config-next@16.3.4` fails via
  `eslint-plugin-react@7.37.5`: `contextOrFilename.getFilename is not a
  function` — the plugin uses an API ESLint 10 removed.

**Alternatives.** Keep TS 7 and drop type-aware linting; run TS 6 side by side
for the linter; keep ESLint 10 and drop `eslint-config-next`.

**Reason chosen.** Lint is part of the definition of done. A toolchain where one
of the four required checks cannot run is not a production toolchain. Both
downgrades are on well-supported lines and cost nothing at this project's size.

**Risk.** Sitting one major behind on two tools; the gap widens if left.

**How measured.** `pnpm verify` staying green.

**Revisit condition.** `typescript-eslint` ships TS 7 support (issue #10940), and
`eslint-config-next` supports ESLint 10. Re-test both together, not separately.

---

## D-011 — `cacheComponents` / PPR deferred, not rejected

**Decision.** Ship Slice 1 without `cacheComponents: true`. Homepage is static,
`/start` and admin are `force-dynamic`.

**Evidence.** RESEARCH OBSERVATION from Next's shipped docs: `cacheComponents`
is a top-level (non-experimental) config in 16.0.0 that implements PPR as the
App Router default and removes `experimental.ppr`; it requires the Node runtime;
`unstable_cache` is superseded by `'use cache'`; `revalidateTag` now takes a
second `cacheLife` argument.

**Alternatives.** Enable it now; never enable it.

**Reason chosen.** Enabling it changes caching and metadata semantics across
every route at the same moment the whole application is new. Slice 1's job was a
verified money path. Adopting it is a scheduled slice with its own verification,
not a flag flipped in passing.

**Risk.** Retrofitting `'use cache'` discipline later costs more than starting
with it. Accepted, and deliberately scheduled early — before the venue database
adds many routes.

**How measured.** p75 LCP/TTFB before and after; build time.

**Revisit condition.** Scheduled as Slice 6 in `docs/PHASE_PLAN.md`.

---

## D-012 — Structured data: Organization only. No LocalBusiness, no ratings.

**Decision.** Emit `Organization` sitewide with `areaServed` and **no**
`address`. Emit `BreadcrumbList` once breadcrumbs are visible. Never emit
`AggregateRating`, `Review`, `FAQPage`, or `Event` on a service page. On future
venue pages, mark up `Article`/`WebPage` authored by us, with the venue as a
nested non-primary `Place` carrying only `name` and `sameAs`.

**Evidence.** RESEARCH OBSERVATION (see the limitation note above —
`developers.google.com` was blocked, so these are search-extracted quotes of
Google's docs, not pages read directly):

- **FAQPage is finished, not merely restricted.** The 2023 gov/health carve-out
  is out of date. Google's notice: *"FAQ rich results are no longer appearing in
  Google Search. We will be dropping the FAQ search appearance, rich result
  report, and support in the Rich results test in June 2026."* All three
  milestones have passed. Zero upside remains.
- **Self-serve reviews are ineligible.** Pages using `LocalBusiness` or any
  `Organization` subtype are excluded from the review feature when the reviewed
  entity controls the reviews — including via an embedded third-party widget.
  With zero reviews there is no compliant construction, and emitting
  `AggregateRating` anyway invites a spammy-structured-markup manual action,
  after which all structured data on the page is ignored.
- **LocalBusiness needs a real, publicly displayed address.** Marking up an
  address not visible on the page violates the visibility guideline. The company
  has no publishable storefront.
- **Marking up a venue we do not own as the page's primary entity** risks
  Google associating that entity with our domain. UNVERIFIED: no explicit Google
  prohibition was found; the general relevance guideline (*"your structured data
  must be a true representation of the page content"*) is what drives this.

**Alternatives.** Emit everything and let Google ignore what it will.

**Reason chosen.** Every rejected type is either dead weight or an active
manual-action risk, and each one is also fabrication surface. `BreadcrumbList`
is the one clear win: a real rich result requiring no claims.

**Risk.** Foregoing rich results a competitor might obtain. Assessed as near
zero given the above.

**How measured.** Search Console enhancement reports; Rich Results Test.

**Revisit condition.** Genuine third-party reviews exist and are displayed
on-page; or a real publishable address exists; or Google's guidance changes —
**re-verify against `developers.google.com` directly** once reachable.

---

## D-013 — Legal posture on transportation and vendor vetting

**Decision.** Transportation is described only in coordinating terms, with a
standing above-the-footer disclosure. The vendor-vetting claim ships **only**
once a documented per-vendor file exists.

**Evidence.** RESEARCH OBSERVATION (primary sources blocked at the proxy; quoted
via search extraction, URLs recorded for later verification):

- **CGS §13b-101** defines a motor vehicle in livery service as one used by any
  person or company *"which represents itself to be in the business of
  transporting passengers for hire."* The trigger is **holding out**, not
  ownership. Enforcement sits with CT DOT's Bureau of Public Transportation,
  Regulatory and Compliance Unit.
- **Penalty:** civil penalty up to **$1,000 per day, per violation**.
- The §13b-103 "weddings, funerals, processions" clause waives the **hearing**,
  not the **permit**. It is not an exemption.
- **49 U.S.C. §13102(2)** defines a broker as one who *"holds itself out by
  solicitation, advertisement, or otherwise as selling, providing, or arranging
  for, transportation by motor carrier for compensation."* Advertisement is an
  express trigger.
- **CUTPA (CGS §42-110b(b))** directs Connecticut courts to follow FTC
  interpretations; FTC deception turns on **net impression** — *"the entire
  mosaic, rather than each tile separately."* Stock limo imagery can therefore
  mislead even when the adjacent text is literally true. Remedies under
  §42-110g include punitive damages and attorney's fees.
- **Publishing a vetting standard creates a duty.** Under the voluntary
  undertaking doctrine (Restatement (Second) of Torts §324A) a company that
  undertakes a protective service can be liable where it is relied upon; and
  negligent selection of an independent contractor is the company's *own*
  negligence. An unperformed verification claim is separately a CUTPA deception.
- **VERIFIED FACT:** Connecticut licenses no event planner or wedding planner
  occupation. CUTPA is the operative regime.

**UNVERIFIED / requires an attorney.** Whether FMCSA passenger-broker
registration is required (§13102(2)'s definition reaches passengers, but
§13904's registration and 49 CFR Part 371 are property-only, and no passenger
broker authority category was identifiable); whether CT DOT treats a pure
arranger as "holding out"; whether a markup or bundled single price converts the
coordinator into a reseller; whether the Home Solicitation Sales Act (CGS ch.
740, three-business-day cancellation right) attaches to contracts signed at
venue site visits.

**Reason chosen.** The exposure here is created by *words*, not by the business
model. Copy rules that a writer can apply mechanically are the cheapest possible
mitigation. The mechanical list lives in `CLAUDE.md`.

**Risk.** Conservative phrasing converts marginally worse than "we provide
wedding transportation." Accepted without argument — a $1,000/day exposure is
not a conversion trade.

**How measured.** Copy review against the banned list before any page ships.

**Revisit condition.** Counsel reviews and rules on the four open questions.

---

## D-014 — The venue database is a conversion and credibility asset, not a
traffic engine

**Decision.** Build the Connecticut Venue Intelligence Database, but scope and
justify it as a **conversion, credibility and AI-citation asset** and a wedge
into the **regional venue-guide corridor** — explicitly **not** as a source of
direct search traffic from per-venue logistics queries. Target roughly 25–40
venues with genuine depth rather than 200 thin records.

**Evidence.** This decision **contradicts the original brief**, on research.

- **RESEARCH OBSERVATION (negative finding).** Queries of the form
  `"[venue] parking shuttle capacity"` returned couples' personal Zola wedding
  sites and generic directories — the signature of no dedicated search intent.
  No dedicated authoritative page ranked. Per-venue logistics queries show no
  evidence of meaningful volume.
- **RESEARCH OBSERVATION.** The premise that this data is not public is **false
  for a meaningful slice of it.** Saint Clements Castle publishes room-by-room
  capacities; The Barn at Black Walnut Farm publishes "onsite parking for up to
  100 cars", 8am setup access and "events wrap by midnight"; Eleven Thirty
  Consulting publishes "parking limited to 25 vehicles total" and an open vendor
  policy; The Grand Oak Villa publishes a shuttle policy. The gap is
  **aggregation and normalisation**, not discovery — which means it is
  copyable by any competitor with a scraper.
- **RESEARCH OBSERVATION (the encouraging finding).** Independent photographer
  blogs with modest authority *do* rank for CT venue-guide terms. That corridor
  is winnable at zero domain authority; the "hire a planner" corridor is not.
- **RESEARCH OBSERVATION.** The concern is universal even though the query is
  not: the mature "questions to ask a wedding venue" cluster is organised around
  parking, shuttles, noise curfew and vendor policy.

**Alternatives.** Build it as the primary organic traffic play, per the original
brief. Or skip it.

**Reason chosen.** The asset is real but was mispriced. Logistics depth is what
makes our regional guides better than the photographers' roundups that currently
win those terms; it is the differentiator, not the traffic source. It also
converts, because it demonstrates competence a new company cannot otherwise
prove.

**Risk.** Accuracy liability on facts about venues we do not operate, and those
facts decay. Mitigated by per-field provenance and verification dates in the
schema. Separately: publishing curfews, mandatory-vendor status or parking
shortfalls can antagonise the venues whose referrals a new coordinator needs.

**How measured.** Rankings for `[region] wedding venues` and `[venue] wedding`,
**not** for logistics terms. Inquiry rate on venue pages vs. site average.

**Revisit condition.** Six months of data. If venue pages neither rank for guide
terms nor convert above average, cut the programme rather than expand it.

---

## D-015 — Four verticals held, with an explicit build-order priority

**Decision.** Keep all four verticals as scope, but build in this order:
weddings + venue coordination first (shared content engine), private events
second, corporate last.

**Evidence.** RESEARCH OBSERVATION: `corporate event planner connecticut`
returns **Indeed job listings** on page 1 — the intent is contaminated with
job-seeker traffic — and the rest is directory-locked (The Bash, GigSalad,
Eventective, BBB). RESEARCH OBSERVATION: `wedding planner connecticut` is
contested but independents do rank; the cost/budget and venue-guide clusters are
genuinely winnable. RESEARCH OBSERVATION: three of roughly ten independent CT
planners surfaced publish real prices (Irene & Co from $9,500; Rose Hill from
$3,000; Sarah Brehant at 16–18% of budget), while The Knot and Thumbtack have
already commoditised the price question at scale.

**Alternatives.** Build all four in parallel, per the brief's flat framing.

**Reason chosen.** A zero-authority site spreading across four verticals
under-builds all four. Weddings and venue coordination share one content engine;
corporate and private need their own.

**Risk.** Corporate revenue arrives later than it might have.

**How measured.** Organic entrances and inquiries per vertical.

**Revisit condition.** Corporate inquiries arrive from relationships and
warrant earlier content investment.

**Note.** Published pricing is a **conversion and trust** differentiator, not an
SEO one — it will not win rankings; it will win the inquiry. Position
accordingly, and do not build the brand on it.

---

## D-016 — Warm light palette, not the dark house style

**Decision.** Ground is warm paper `#faf7f2`, ink is warm charcoal `#1c1917`,
with a single deep claret accent `#7a1e2e` and sage as a supporting neutral. A
full dark theme is defined at the token level.

**Evidence.** STRATEGIC INFERENCE. The governing design skill assigns this
project Tier 4 (product/SaaS precision: trust and conversion, premium not
flashy) and states that Tier 4 must execute light and dark to the same standard.

**Alternatives.** The dark digital palette used elsewhere in the brand portfolio.

**Reason chosen.** Dark chrome reads as nightlife or developer tooling. This
audience is planning a wedding or a company offsite and is deciding whether to
trust a brand-new company with a five-figure event. Warm paper with one
disciplined accent reads considered and regional. Explicitly rejected: blush and
gold script wedding cliché, SaaS gradients, glassmorphism.

**Risk.** Visual divergence from sibling brands. Irrelevant — those are
different audiences on different domains, and cross-referencing them is banned.

**How measured.** Contrast ratios; inquiry rate.

**Revisit condition.** Testing shows the light treatment underperforms.

---

## D-017 — Fraunces and Instrument Sans, self-hosted via `next/font`

**Decision.** Display face Fraunces (variable, with `SOFT`/`WONK`/`opsz` axes),
body face Instrument Sans. Both self-hosted at build time.

**Evidence.** VERIFIED FACT (tested in this environment): `fonts.googleapis.com`
and `fonts.gstatic.com` are reachable, but `api.fontshare.com` is blocked at the
proxy — so Fontshare families such as General Sans and Cabinet Grotesk cannot be
fetched here. RESEARCH OBSERVATION: `next/font` downloads at build time and
serves from our own origin, sends no request to Google at runtime, and its
`adjustFontFallback` generates a size-matched fallback to reduce CLS.

**Alternatives.** Fontshare families (blocked); a licensed foundry face (no
licence); system stack (disqualified — the design standard rules out Inter,
Roboto, Arial and `system-ui` as display faces).

**Reason chosen.** Fraunces is warm and editorial with genuine personality
without tipping into calligraphic wedding cliché. Instrument Sans is a clean
contemporary grotesque that avoids the default-Inter look. Two faces, no
runtime third-party request, no layout shift.

**Risk.** Neither is a distinctive paid foundry face.

**How measured.** CLS at p75; LCP.

**Revisit condition.** Budget for a licensed display face, or Fontshare becomes
reachable.

---

## D-018 — No published pricing until the business supplies real numbers

**Decision.** Build the pricing and estimator **system**, but publish no number
until the founder supplies real ones. The inquiry form's budget bands describe
the **customer's** event budget and are a qualification input — they are not a
price list and must never be presented as one.

**Evidence.** The no-fabrication rule. Pricing is a business decision, not an
engineering one.

**Alternatives.** Publish market-derived ranges from the research (Thumbtack
Hartford: day-of $800–$1,700, partial $1,500–$3,800, full $3,500–$8,000+).

**Reason chosen.** Those are *other companies'* prices. Publishing them as ours
would be fabrication and, under FTC pricing guidance, an advertised price must
be one at which the service is *"openly and actively offered… honestly and in
good faith."* We cannot honour a number the business has not set.

**Risk.** The single strongest available trust signal stays offline until the
founder acts. This is a named blocker.

**How measured.** Inquiry rate before and after pricing publishes.

**Revisit condition.** The founder supplies a real fee structure. Then ship the
pricing slice, with every material variable disclosed adjacently and estimator
output labelled an estimate, not a quote.

---

## D-019 — Generated imagery, used as atmosphere and never as evidence

**Decision.** Site photography may be AI-generated or licensed stock. It is used
for mood only, is never captioned or positioned as documenting work this company
performed, and every image is reviewed against a fixed checklist before it
ships.

**Evidence.** STRATEGIC INFERENCE, with one VERIFIED FACT inside it.

- `CLAUDE.md` already permits licensed or stock imagery for mood and atmosphere,
  and already forbids presenting it as documentation of our own work. Generated
  imagery is the same category: what matters is the claim a viewer takes from
  the page, not how the pixels were produced.
- **VERIFIED FACT, from the first batch reviewed:** three of five generated
  images raised content questions, none of them about origin.
  1. A conference-room image renders an organisation name on the lectern and
     civic taglines on the walls, which can be read as a client relationship
     that does not exist.
  2. A dinner-table image depicts olive groves, cypress and vineyard hills -
     unmistakably Mediterranean - against a scope that is Connecticut-only.
  3. A coordination image carried a legible run-of-show dated in the past,
     which reads as documentation of a completed event. Regenerated with a
     future date, it cleared.
- **Founder decision, recorded:** items 1 and 2 were raised, the reasoning was
  put in writing twice, and the founder elected to publish both as-is on the
  grounds that the scenes are synthetic. Item 3 was regenerated.
- The disagreement is worth stating precisely, because it defines what this
  decision does and does not cover: the objection was never that the images are
  generated. It was that a viewer reads what is inside the frame - a name on a
  lectern, a cypress on a hillside - and cannot tell whether the pixels behind
  it were photographed or produced. Synthetic origin answers a question nobody
  asks.
- The failure mode is therefore predictable and specific: generators emit real
  and real-seeming brands, wrong geography, and plausible documents. Origin is
  not the risk. Frame content is.

**Alternatives.** Own photography only (slower, but nothing synthetic); licensed
stock (real geography and documented rights, but a per-image cost); no
photography at all (fastest and cleanest, and the site already passes every
check without it).

**Reason chosen.** The founder's call, made with the tradeoff stated in full.
Generated imagery reaches a finished look immediately at no cost, and the
honesty rule that governs it is the same one that already governs stock.

**Risk.** Two specific exposures are live and accepted:

1. If the organisation named on the lectern is real, publishing it on a service
   page can be read as claiming a client we do not have, and is a trademark
   question besides. If it is not real, it is an invented client. Either
   reading fails the no-fabrication rule on its face.
2. A Mediterranean landscape on a Connecticut-only site cuts against the
   geographic honesty the rest of the copy is careful about, and against the
   specificity that `docs/CONTENT_MODEL.md` treats as the brand's tone.

Beyond those: a site whose central argument is "we fabricate nothing" using
synthetic photography is a tension a sharp visitor could name. Defensible -
atmosphere is not proof - but not costless, and it depends on the checklist
being applied every time rather than most times.

**How measured.** The review checklist in `public/images/README.md`, applied
before any image is committed. The page-contract check enforces alt text on
every image; it cannot enforce what is inside the frame, and a human must.

**Revisit condition.** Real event photography exists, at which point genuine
images of our own work replace generated ones wherever they can - real proof
outranks atmosphere every time. Sooner than that: if anyone outside the company
reads the lectern image as a client claim, or the Mediterranean image as a
service area, replace those two first - they are the two this decision
knowingly accepted.

---

## D-020 — Tailwind v4 `@theme` cannot live inside a media query

**Status:** VERIFIED FACT, and a defect that shipped.

`src/app/globals.css` defined the dark palette as a `@theme` block nested inside
`@media (prefers-color-scheme: dark)`. That reads correctly and is wrong.
Tailwind v4 resolves `@theme` at build time and flattens every declaration to the
top level, discarding the surrounding at-rule. The compiled stylesheet contained
**no `prefers-color-scheme` rule at all**, and `--color-paper` resolved to the
dark value unconditionally.

Every visitor, on every page, since the tokens were written, saw the dark
palette — including the one the design brief explicitly rejects as "nightclub
dark chrome" (D-016).

**The rule.** `@theme` is top-level only. Anything conditional redefines the same
custom properties in a plain `:root` rule inside a real media query, which works
because Tailwind v4 utilities compile to `var(--color-*)` rather than to literal
values. `color-scheme` is set alongside so form controls, scrollbars and the
canvas behind the page follow the same switch.

**Why it went unnoticed.** Every check in the build asserted the *source*. Source
is the one version of a stylesheet that cannot be wrong in this way. Two
page-contract checks now assert the computed result instead: every indexable
route must paint `rgb(250, 247, 242)` under a light scheme, and the homepage must
paint `rgb(22, 19, 15)` under a dark one. Text contrast is computed in both.

**What that immediately caught.** `--color-ink-subtle` at `#78716c` was 4.49:1 on
paper and 4.11:1 on paper-sunk — under WCAG AA on both, on every eyebrow,
breadcrumb, caption and fact label on the site. Now `#6f6863`. The dark accent
was `#d98a92`, which on a near-black ground reads as blush pink and is the exact
template-wedding register D-016 rejects; now `#b8303f`, which keeps the claret
and clears both the 4.5:1 text requirement and 3:1 against the ground.

**Revisit if:** Tailwind changes how `@theme` resolves. The computed-value checks
stay regardless — they are cheaper than the class of bug they catch.

---

## D-021 — The operator surface shows two different facts, never one

**Status:** RECOMMENDATION, implemented.

The inquiry queue originally showed SLA state in a column headed "Status", which
meant a won deal and a spam submission looked identical, and a spam row
displayed a response deadline it was never going to have.

These are two independent facts and both have to be visible: **where the lead is
in the pipeline** (new, in progress, quoted, won, lost, spam) and **whether the
published response commitment is being kept** (overdue, answered in Xh, due at
T). Collapsing them loses information the operator needs to act.

The same principle governs the SLA summary above the table. It reports received,
answered inside the window, missed, and the **median** time to first reply.
Median rather than mean: one inquiry answered a week late drags an average far
enough to make a healthy queue look broken, and the number an operator needs is
what a typical reply takes.

"Missed" counts an inquiry answered after its deadline **or** still unanswered
with the deadline past. An inquiry inside its window is neither kept nor missed
yet, and counting it either way would be a lie in one direction.

---

## D-022 — Abandoned funnels are aggregate intelligence, never a contact list

**Status:** RECOMMENDATION, implemented.

`inquiry_drafts` has been capturing partial planner responses since the planner
shipped, and `/admin/funnel` now reads them. The rule that makes this defensible
is the one in the module header: **a draft carries no PII, ever.** Name, email
and phone are asked for on the last step and written only by a real submission.

That has a design consequence the funnel page honours: it shows aggregates only
and never an individual draft. There is nothing about one worth opening, and
building a browser for them would be the first step toward the contact capture
this system declines to do — someone who typed an email address and then decided
not to send it has told us something, and it is *no*.

What the page does show is where people stop, which is the only way to test
PLAN.md's riskiest assumption: that five steps raise qualified submissions
rather than suppressing them. Step count is a constant in
`lib/domain/planner-steps.ts`, so four against five is an edit rather than a
rebuild — but only once there is data to justify it.

Abandonment is derived at read time (active, and untouched for 30 minutes)
rather than written by a scheduler. No cron to fall behind, and one definition.

---

## D-023 — A footer link is not an internal link

**Status:** RECOMMENDATION, implemented as a build check.

PLAN.md promised an orphan check in P0 and it was never built, so the failure it
existed to catch ran live: `/about` had twelve inbound links and not one of them
came from page content. On a site whose entire trust position is "we are new and
here is exactly how new", nothing in the site's own writing pointed at the page
that says so.

`scripts/link-graph.mjs` applies two thresholds:

- **Reachable** — at least one inbound link from another indexed page. Zero is a
  hard failure; the page is an island that only the sitemap knows about.
- **Contextual** — at least one inbound link from outside `<header>` and
  `<footer>`. Site chrome links every page it lists from every page there is, so
  a footer link proves the page exists, not that it belongs to the site's
  argument.

`/privacy`, `/terms` and `/accessibility` are named in the script as legitimately
chrome-only, with the reason inline. An exception that has to be written down
next to its justification is an exception somebody will reconsider; a silent one
is not.

---

## D-025 — The public brand is provisional; the legal entity is not

**Status:** RECOMMENDATION, implemented.

New England Event Planners LLC remains the legal entity. The public trading name
is under review and is treated as a value, not a fact: the business concept —
a premium event planning, coordination and execution company, asset-light, with
a vetted vendor network — has a higher ceiling than a descriptive category name
comfortably carries.

**Why now rather than later.** A rename is never cheaper than at zero traffic,
zero reviews, zero backlinks and zero case studies. The cost rises every month
the name accumulates equity, so the cheap window is open exactly once.

**The mechanism.** `siteConfig.name` is the single source of truth. Every public
surface — metadata, Open Graph cards, structured data, `llms.txt`, the footer,
the planner's trust rail — reads it. Three files may hold the literal, each for a
stated reason, and `scripts/brand-check.mjs` fails the build if a fourth appears:

- `src/lib/site-config.ts` defines it.
- `src/app/global-error.tsx` replaces the root layout when the module graph is
  suspect; importing anything to render an error page is how an error page fails
  to render.
- `src/app/icon.svg` is served verbatim and cannot read config. **Note this one
  is not a string change at rename time** — the mark is an "N" monogram and needs
  redrawing.

The architecture already anticipated a DBA: `/about` renders "{name} is a trading
name of {legalName}" and the legal pages read `legalName` throughout.

**Verified, not assumed.** Setting `name` to a different string, rebuilding and
grepping all thirteen routes plus `llms.txt` returns zero occurrences of the old
name beyond the LLC legal name, which correctly persists. Repeat that procedure
at the real rename.

**Still needed:** the name itself and a domain. Candidates checked by DNS and
likely unregistered at the time of writing: `throughlineevents.com`,
`linchpinevents.com`, `halyardevents.com`, `callsheetevents.com`,
`theshowrunnerco.com`, `keelevents.com`. No nameserver is a strong signal of
unregistered, not proof — confirm at a registrar.

---

## D-026 — Show the machinery, and label it as a template

**Status:** RECOMMENDATION, implemented.

The category's websites are galleries of flowers. What a client is actually
buying is the documentation underneath — the run of show, the vendor status
board, the load-in constraints — and that is the one asset a competitor cannot
approximate with stock photography.

So `/how-we-work` shows three of them, rendered as real tables rather than as
pictures of tables: readable by a screen reader, selectable, translatable, and
weighing nothing.

**The line this must not cross.** These are **templates** — the documents every
event gets — and each carries that on its face in a required `caption` prop, not
in a footnote. Presenting one as a record of a completed event would be the
fabrication `CLAUDE.md` forbids. The caption is what keeps the distinction
visible rather than merely intended, which is why the component cannot be
rendered without one.

The same line governs photography, and it resolves the imagery brief: pictures of
our own documents, kit and process need no caveat; a picture that would read as
evidence of an event this company ran is not available until there is one. See
`public/images/README.md`.

**Consequence for the shot list.** The original nine-image brief was atmosphere —
rooms, tables, place settings. It is reweighted to roughly two-thirds machinery,
because atmosphere is the half a competitor can buy and the machinery is not.

---

## D-019a — Amendment: what the delivered frames actually contain

**Status:** VERIFIED FACT (the contents) plus a RECORDED OWNER DECISION.

D-019 accepted generated imagery as atmosphere on two named risks. The five
frames have now been supplied and inspected, so the risks can be stated as facts
rather than as predictions. This amendment exists because a decision inherited
without its evidence is a decision nobody can revisit intelligently.

**Frames that carry no issue.** The waterfront function room (`hero-home`) and
the place setting (`hero-weddings`) contain table numbers and a food menu and no
third-party mark. They read as coastal New England. Nothing to flag.

**The conference room (`hero-corporate-events`) names a real organisation.**
The lectern reads "THE CONNECTICUT FORUM" and the wall carries "PEOPLE · IDEAS ·
A STRONGER CONNECTICUT" and "CIVIC DIALOGUE BUILDS A BRIGHTER TOMORROW". The
Connecticut Forum is an existing Hartford non-profit. The generator reproduced an
actual organisation's identity rather than inventing a plausible one, so on
`/corporate-events` the frame implies a client or venue relationship that does
not exist — and the mark is a third party's, not only our claim.

This was raised twice. The first time the owner's response was that the image is
generated and carries no branding. The second time the specific fact above was
put to him, and **he reaffirmed shipping it as-is.** That is his call to make and
it is recorded here with what was known at the time, not paraphrased.

**Revisit if:** anyone associated with The Connecticut Forum raises it, an
enquiry references it, or a corporate frame without readable signage becomes
available. Replacing it is a one-file commit — the slot resolves whatever is on
disk — so the cost of reversing this is close to zero and it should be reversed
the moment there is an alternative.

**The long outdoor table (`hero-private-events`) reads Mediterranean.** Olive
trees, cypresses and vineyard hills, against a rule that imagery must be
Connecticut or nowhere identifiable. Weighed and accepted under D-019; noted here
once so the record is complete.

**The run of show (`hero-venue-vendor-coordination`) is the strongest of the
five**, and it is the only one that shows the work rather than the result. It
carries a dated, specific document, so it renders with a caption saying it is our
own kit during setup and not a client event. `SlotImage` gained caption support
for this, which also makes the standing "representative" caption requirement for
vehicle imagery implementable for the first time.
