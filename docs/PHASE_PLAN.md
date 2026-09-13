# Phase plan

Read this at the start of every session. Pick the first slice not marked
**DONE**. Do not start a second slice before the current one passes its exit
gate.

A slice is a **vertical cut through the whole stack that a user or an operator
can actually use**. "Build the venue schema" is not a slice. "A visitor can find
a Connecticut venue by region, read verified logistics for it, and submit an
inquiry attached to that venue" is a slice.

Ordering is `(revenue impact x customer impact x strategic importance x risk
reduction) / complexity`.

---

## Phase 1 — Working business

### Slice 1 — The money path — **DONE**

Fixed by the brief. Nothing else could ship before it.

**Scope.** Intake form to server validation to database persistence to
attribution capture to notification to a working admin list behind real
authentication.

**Files.** `src/proxy.ts`, `src/lib/{env,site-config}.ts`,
`src/lib/db/{index,schema}.ts`, `src/lib/attribution/types.ts`,
`src/lib/validation/inquiry.ts`, `src/lib/domain/inquiry-options.ts`,
`src/lib/security/{hash,form-token,form-fields,rate-limit,request-context}.ts`,
`src/lib/inquiries/{create,queries,reference}.ts`, `src/lib/notify/index.ts`,
`src/lib/auth/{session,guard}.ts`, `src/app/(marketing)/**`, `src/app/admin/**`,
`src/components/**`, `src/app/globals.css`, `scripts/**`, `tests/**`.

**Acceptance criteria — all met.**

- [ ] `/start` renders a complete inquiry form, server-rendered and indexable
- [ ] The form submits with JavaScript disabled (Server Action + `useActionState`)
- [ ] Server validation is authoritative; unknown enum values are rejected
- [ ] Invalid submissions re-render inline errors and preserve typed values
- [ ] Valid submissions persist with a unique human-readable reference
- [ ] First touch, last touch, UTMs, click ids, referrer, landing path, session
      and visit count are captured and visible in admin
- [ ] A response deadline is set on every inquiry and overdue ones are flagged
- [ ] A notification row is written before any delivery attempt
- [ ] An unconfigured email provider is reported as unconfigured, never as sent
- [ ] Persistence failure shows the customer a real error and a direct contact
      route, and logs an incident id
- [ ] Admin requires authentication; every page and action re-checks it
- [ ] Login is rate-limited per IP and per account, with uniform error copy
- [ ] 375px, no horizontal overflow, on every page
- [ ] Keyboard-only completion of the form and of login
- [ ] No console errors; no secrets in client bundles

**Test plan — done.** 84 Vitest tests (validation, security primitives,
attribution codec, and money-path integration against real PostgreSQL) plus 55
Playwright browser checks.

**Exit gate — passed.** `pnpm verify` green; `pnpm verify:e2e` 55/55.

---

### Slice 2 — Founder identity and the vetting standard

The single highest-leverage trust asset available before any real proof exists,
and the cheapest to build.

**Scope.** `/about` with the founder's real name, photo, bio and credentials.
`/how-we-work` publishing the process end to end with timings, and the vendor
vetting criteria as a public standard. Contact details wired through
`siteConfig` so absent values omit the route rather than faking one.

**Files.** `src/app/(marketing)/about/page.tsx`,
`src/app/(marketing)/how-we-work/page.tsx`, `src/lib/site-config.ts`,
`src/app/sitemap.ts`, shared content components.

**Acceptance criteria.**

- [ ] Founder page carries a real name, real photo and a real bio — or the slice
      does not ship. No stock photography of a person, ever.
- [ ] The process page states what happens after submit, step by step, with the
      same SLA number the form and admin enforce, read from one source
- [ ] Vendor vetting criteria are stated as what we *will* do, in the present
      tense, only for checks that are actually performed and documented
      (see `docs/DECISIONS.md` D-013 — publishing this creates a legal duty)
- [ ] No claim of a past customer, event, review or partnership anywhere
- [ ] `BreadcrumbList` on both pages, matching visible breadcrumbs
- [ ] Both pages in the sitemap, canonical, indexable, one `h1` each

**Test plan.** Extend `scripts/verify-slice1.mjs` into a shared page-contract
checker run over every public route: heading order, canonical, indexability,
375px overflow, forbidden-phrase scan (the D-013 banned list plus fabricated
proof terms).

**Exit gate.** `pnpm verify` green. Page-contract checks pass for all public
routes. **Blocked on the founder supplying bio, photo and credentials.**

---

### Slice 3 — Vertical service pages

Turns the four verticals from a list on the homepage into four indexable
entry points that convert.

**Scope.** `/weddings`, `/corporate-events`, `/private-events`,
`/venue-vendor-coordination`. Each states what is included, how it works, and
links to `/start` with the vertical preselected.

**Files.** `src/app/(marketing)/[vertical]/page.tsx` — written individually, not
generated from a template — plus a shared page shell and
`src/lib/domain/verticals.ts`.

**Acceptance criteria.**

- [ ] Four hand-written pages. Templated substitution is a doorway page and is
      forbidden
- [ ] Each links into `/start` with its event type preselected via a query
      parameter, validated server-side against the canonical list
- [ ] Wedding page covers shuttle and guest transport **logistics** as
      demonstrated competence — never as a transportation offer, and never as a
      separate landing page
- [ ] Every page passes the D-013 banned-phrase scan
- [ ] Internal linking is deliberate: homepage to verticals to `/start`
- [ ] `Service` schema optional and only where it matches visible content; no
      `Event`, no `FAQPage`, no ratings

**Test plan.** Page-contract checks over all four. A test asserting the
preselect parameter is validated server-side. Banned-phrase scan.

**Exit gate.** `pnpm verify` green; contract checks pass; a human reads all
four aloud for tone.

---

### Slice 4 — Venue database, end to end, ten venues

The moat — scoped per `docs/DECISIONS.md` D-014 as a **conversion and
credibility** asset, not a traffic engine. Ten venues first, to test the
production cost of verification before committing to forty.

**Scope.** Venue schema with per-field provenance. Admin CRUD. Public
`/venues/[slug]` pages. `/venues` regional index. Venue-attached inquiries.

**Files.** `src/lib/db/schema.ts`, `src/lib/venues/**`,
`src/app/(marketing)/venues/**`, `src/app/admin/venues/**`, migrations.

**Acceptance criteria.**

- [ ] Every venue field carries its own source URL, verification date and
      confidence. An unverified field renders as "not confirmed", never blank
      and never guessed
- [ ] Ten real Connecticut venues with genuinely verified data, spread across
      regions. A venue record without substantial verified content does not ship
- [ ] Each venue page carries an inquiry CTA that attaches the venue to the lead
- [ ] `Article`/`WebPage` schema authored by us, plus `BreadcrumbList`. The venue
      appears only as a nested non-primary `Place` with `name` and `sameAs`.
      Never `LocalBusiness` for a venue we do not own (D-012)
- [ ] `/venues` is a genuinely useful regional index, not a link list
- [ ] Admin can edit a venue, and edits are audit-logged
- [ ] `generateStaticParams` prerenders venue pages; p75 LCP under 2.5s

**Test plan.** Schema tests for provenance requirements. A test asserting a
venue with insufficient verified fields cannot be published. Contract checks
over all ten pages. Attribution test proving venue-attached inquiries record
their venue.

**Exit gate.** `pnpm verify` green; ten pages pass contract checks; time-to-
verify per venue recorded so slice 8 can be sized honestly.

---

### Slice 5 — Operator workflow

Slice 1 lets an operator *see* leads. This lets them *work* them. Without it the
SLA promise degrades the moment volume arrives.

**Scope.** Status filters and search in admin. Internal notes per inquiry.
Assignment. An SLA dashboard. Notification retry for failed rows.

**Files.** `src/app/admin/inquiries/**`, `src/lib/inquiries/**`,
`src/lib/notify/**`, migrations for `inquiry_notes`.

**Acceptance criteria.**

- [ ] Filter by status, vertical and overdue; search by name, email, reference
- [ ] Timestamped internal notes, attributed to the admin who wrote them
- [ ] Failed notifications can be retried from admin, with the attempt recorded
- [ ] SLA view showing overdue, due soon, and median first-response time
- [ ] Every mutation is audit-logged
- [ ] Pagination holds at 1,000+ inquiries without a full table scan

**Test plan.** Integration tests per filter. A seeded-volume test asserting
query plans stay indexed. Authorisation tests proving each new action
re-checks auth independently.

**Exit gate.** `pnpm verify` green; an operator completes a full lead lifecycle
by keyboard alone.

---

### Slice 6 — Cache Components and performance budget

Deliberately after the venue pages exist, so the change is measured against a
realistic route count, and before the content programme multiplies them.

**Scope.** Enable `cacheComponents: true`. Apply `'use cache'` and `cacheLife`
to public routes. Keep admin dynamic. Establish a measured performance budget.

**Acceptance criteria.**

- [ ] `cacheComponents: true` with the full suite still green
- [ ] Metadata stays prerenderable so tags land in `<head>`, not streamed into
      `<body>` (matters for HTML-limited crawlers — see D-011)
- [ ] `revalidateTag` calls carry the required second `cacheLife` argument
- [ ] Publishing a venue edit invalidates that page within one revalidation cycle
- [ ] Measured p75: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Before/after numbers recorded in this file

**Exit gate.** `pnpm verify` and `pnpm verify:e2e` green; budget met and
recorded. **If the numbers do not improve, revert and record that** — D-011 is a
hypothesis, not a commitment.

---

### Slice 7 — Published pricing and the cost estimator

**Blocked on the founder supplying a real fee structure** (D-018). Everything
else in the slice can be built against a schema and switched on with real data.

**Acceptance criteria.**

- [ ] Every published figure traces to a founder-supplied number. No
      market-derived placeholder ever renders
- [ ] Every material variable disclosed adjacently, not behind a link
- [ ] Estimator output labelled an estimate, not a quote
- [ ] Estimator state carries into `/start` so a lead arrives pre-qualified
- [ ] Works with JavaScript disabled, or degrades to the published ranges
- [ ] Estimator inputs recorded on the inquiry for qualification

---

### Slice 8 — Venue database expansion to 25–40

Only after Slice 4 has produced a real per-venue verification cost and Slice 4's
pages have six months of ranking and conversion data. Per D-014, if venue pages
neither rank for regional guide terms nor convert above site average, **cut the
programme rather than expand it.**

---

## Explicitly not in Phase 1

- Any transportation landing page, in any form. Not a scope question — a legal
  one (D-013).
- Any reference or link to the other DBAs held by the legal entity.
- Any page for a state other than Connecticut.
- Reviews or testimonials UI, until real ones exist.
- Blog or content marketing at volume, until the venue-guide corridor is proven.

## Running record

| Slice | Status | Notes |
| --- | --- | --- |
| 1 — Money path | Not started | Reset 2026-09-13: repo restarted from scratch, code removed |
| 2 — Founder & vetting | Not started | Blocked: founder bio, photo, credentials |
| 3 — Vertical pages | Not started | |
| 4 — Venue database (10) | Not started | |
| 5 — Operator workflow | Not started | |
| 6 — Cache Components | Not started | Record before/after numbers here |
| 7 — Pricing | Not started | Blocked: real fee structure |
| 8 — Venue expansion | Not started | Gated on Slice 4 outcome data |
