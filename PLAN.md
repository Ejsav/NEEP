# New England Event Planners — production build plan

## Context

`newenglandeventplanners.com` is a Connecticut-first event coordination company
launching from zero: zero traffic, zero authority, zero completed events, zero
reviews, zero vendors on file. The site's job is to generate a high volume of
qualified event inquiries in Connecticut, then scale that engine across New
England.

The repo is **not** a greenfield. Slice 1 — the entire inquiry money path — is
shipped and green: Server Action with authoritative Zod validation, HMAC form
tokens, Postgres-backed rate limiting, first/last-touch attribution captured in
`src/proxy.ts`, a notification outbox with an honest unconfigured state, admin
auth on scrypt sessions, and an audit log. 84 Vitest tests against real
Postgres, 55 Playwright checks. `docs/PHASE_PLAN.md` marks Slice 1 DONE.

So this build is an **upgrade of a working revenue system**, not a rewrite. The
central move is replacing the single-page inquiry form with a guided multi-step
planner that persists partial responses — the one capability no competitor in
the benchmark set has — and then building the marketing, trust, venue and SEO
surface around it.

Three constraints from `CLAUDE.md` override conversion optimisation, design
preference and my own judgement: no fabrication of any kind, transportation
honesty in the statutory sense of CGS §13b-101, and no doorway pages.

---

## Resolved conflicts: directive vs. constitution

The master directive and `CLAUDE.md` disagree in six places. Resolutions, with
the four confirmed by you marked ✅:

| Directive says | Repo/constitution says | Resolution |
| --- | --- | --- |
| Supabase Postgres + RLS + Supabase Auth | Drizzle + postgres.js + scrypt sessions (D-002, D-003) | ✅ **Keep Drizzle; point `DATABASE_URL` at Supabase-hosted Postgres.** Managed backups, PITR and pooling with zero rewrite. Server Actions remain the authorisation boundary — every action already re-authorises. RLS added as defence-in-depth on new tables only, never as the primary control. |
| `/transportation` as a fifth service pillar | Transportation is an explicit non-scope legal boundary (D-013) | ✅ **No standalone transportation page, in any form.** Four verticals ship. Transportation appears only as coordinated logistics inside wedding/corporate content and as a planner add-on module. Footer disclosure stays verbatim. |
| Case studies (`/work`) as the primary proof unit | Zero completed events | Build the case-study component and its deliberate empty state. `/work` is **excluded from nav, sitemap and routing** until one real, rights-cleared case study exists. |
| Pricing bands published | D-018 blocks numbers until the founder supplies them | ✅ **Unblocked** — you are supplying a real fee structure. Pricing ships data-driven from one source file; no market-derived placeholder ever renders. |
| Named founder with photo as the top trust signal | Requires a real name, photo, bio | **Still blocked.** `/about` ships without any person depicted. A stock photo of a person is fabrication. The founder module is built and stays dark. |
| Next.js 15, Framer Motion, GSAP, Twilio SMS, Turnstile | Next 16.3.4 shipped; motion restraint; no unconfigured-provider fakery (D-009) | Stay on **Next 16.3.4** — downgrading is pure loss and `src/proxy.ts` is already the Next 16 shape. **No animation library**: motion is CSS transforms plus a ~0.6KB IntersectionObserver `<Reveal>` primitive. **Turnstile built pluggable but inert** (no keys), degrading to honeypot + form token + rate limit. **SMS deferred**, email only — and the admin says so plainly rather than showing a green tick. |

**Venue data** ✅ — you supply a verified venue sheet. I cannot verify venue
facts from this environment (venue sites are egress-blocked; search returns
aggregator snippets only), which is exactly the verification debt
`docs/SEO_STRATEGY.md` records. The exact sheet schema is specified below.

---

## 1. Route map

```
/                                      Homepage
/weddings                              Vertical pillar
/corporate-events                      Vertical pillar
/private-events                        Vertical pillar
/venue-vendor-coordination             Vertical pillar
/plan                                  Guided planner (canonical conversion surface)
/start                                 308 → /plan (preserves the shipped URL)
/thank-you                             Post-submission receipt
/contact                               Direct contact + phone + no-JS form fallback
/how-we-work                           Process, timings, vetting standard
/pricing                               Investment bands + estimator
/about                                 Company, model, partner network (founder module dark)
/venues                                Venue directory, filterable
/venues/[slug]                         Venue record
/guides/[region]                       Regional venue guide (shoreline, litchfield,
                                       fairfield, river-valley, mystic)
/journal                               Editorial — cost/budget corridor only
/journal/[slug]                        Article
/privacy  /terms  /accessibility       Legal
/admin/*                               Existing, extended (noindex at layout)
```

**Deliberately not built:** `/transportation` (legal), `/work` + `/work/[slug]`
(no real case studies), `/locations/[state]` and `/locations/[state]/[city]`
(town-name substitution is the doorway-page pattern `CLAUDE.md` forbids —
regional guides are the honest form and the corridor `docs/SEO_STRATEGY.md`
identifies as actually winnable), `/[service]/[city]` (same reason).

**Content gate, enforced as code not policy.** A `/venues/[slug]` or
`/guides/[region]` page renders `noindex` and is omitted from `sitemap.ts`
unless it passes `assertPublishable()`: ≥400 words of unique prose, ≥3
structured data points present nowhere else, ≥1 verified capacity figure with a
`source_url` and `verified_at`, ≥4 verified non-identity fields, and no
`unknown` field rendered as a number. The gate is a pure function with its own
unit tests; `sitemap.ts` calls the same function the page does.

---

## 2. Information architecture and internal linking

Nothing important sits more than two clicks from the homepage.

- Homepage → four vertical pillars → `/plan` with `eventType` preselected.
- Venue record → up to its regional guide → across to the matching vertical →
  down to `/plan` with `venueSlug` attached.
- Regional guide → every venue record in that region → the wedding pillar.
- Vertical pillar → its strongest regional guide + its two strongest venues.
- `/pricing` and `/how-we-work` are linked from every pillar and from `/plan`
  step 4 (the budget step), where the objection actually surfaces.

**No orphans.** A build-time check walks the route graph and fails if any
indexable page has fewer than two inbound internal links from indexed content.
This runs in `pnpm verify` alongside the existing page-contract checks.

---

## 3. Database schema

Additive migration on the existing 7 tables. Generated with `pnpm db:generate`,
applied with `pnpm db:migrate`.

**New enums:** `scope_tier` (full_planning, partial_planning, day_of_coordination),
`draft_status` (active, converted, abandoned), `venue_region` (shoreline,
river_valley, hartford, litchfield, fairfield), `vendor_policy` (open,
preferred, exclusive), `source_type` (venue_site, municipal_code, state_agency,
maps, direct_confirmation), `confidence` (verified, reported, unknown).

**New columns on `inquiries`:** `scope_tier`, `add_ons` (jsonb string[]),
`venue_slug` (nullable FK-ish reference to `venues.slug`), `draft_id` (nullable,
unique — reconciles the draft to exactly one inquiry).

**New tables:**

- `inquiry_drafts` — `id` (uuid pk), `tokenHash` (unique, HMAC of the draft
  token held in an httpOnly cookie), `status`, `eventType`, `eventDate`,
  `eventDateFlexible`, `guestCountMin/Max`, `venueStatus`, `venueName`,
  `eventTown`, `scopeTier`, `budgetBand`, `servicesNeeded`, `addOns`,
  `furthestStep`, `createdAt`, `updatedAt`, `convertedInquiryId`, `ipHash`.
  **Carries no PII.** Name, email and phone are collected only at step 5 and
  written only on final submit. An abandoned funnel is aggregate intelligence,
  not a person to contact — which is honest, keeps the privacy policy short,
  and is disclosed there anyway. *(Deliberate deviation from the directive's
  implied behaviour; trivially reversible if you want partial contact capture.)*
- `funnel_events` — `id`, `draftId`, `step`, `action` (enter, exit, submit,
  error), `occurredAt`, `ipHash`. Drop-off by step is one `GROUP BY`.
- `venues` — the full field model in `docs/VENUE_DATABASE.md` §Field model:
  identity, capacity by configuration (`capacity_by_room` jsonb), setting,
  the parking/access cluster, timing constraints, vendor policy, guest
  logistics, accessibility, seasonal. Every field nullable.
- `venue_field_sources` — `venueId`, `fieldName`, `sourceType`, `sourceUrl`,
  `verifiedAt`, `confidence`, `note`. **A field without a row here is not a
  field, it is a guess**, and renders as "not confirmed".
- `inquiry_notes` — `inquiryId`, `authorUserId`, `body`, `createdAt`. Powers the
  operator workflow in P7.

`inquiry_status` is **not** extended — drafts are a separate lifecycle with
their own enum, so admin queries that count real leads never accidentally
include abandoned funnels.

---

## 4. Component inventory

Existing to keep: `ui/button.tsx`, `ui/field.tsx` (`Field`, `FieldGroup`,
`describedBy`, `inputClasses`), `site/header.tsx`, `site/footer.tsx`,
`admin/admin-bar.tsx`.

**Primitives** (`src/components/ui/`): `reveal.tsx` (~0.6KB IO client
component), `progress.tsx`, `badge.tsx`, `disclosure.tsx`, `table.tsx`,
`skeleton.tsx`, `empty-state.tsx`, `alert.tsx`, `select.tsx`, `checkbox-card.tsx`,
`radio-card.tsx`.

**Composites** (`src/components/site/`): `sticky-cta.tsx` (mobile `tel:` +
one primary action), `nav-mobile.tsx`, `breadcrumbs.tsx`, `fact-table.tsx`,
`provenance-note.tsx` (renders source + verified date inline),
`venue-card.tsx`, `filter-bar.tsx`, `faq.tsx`, `founder-card.tsx` (dark),
`case-study-card.tsx` (dark), `testimonial-wall.tsx` (dark).

**Sections** (`src/components/sections/`): `hero.tsx`, `vertical-grid.tsx`,
`process-steps.tsx`, `objection-block.tsx`, `pricing-bands.tsx`,
`final-cta.tsx`.

**Planner** (`src/app/(marketing)/plan/`): `planner-form.tsx` (client shell),
`steps/*.tsx` (five fieldsets), `actions.ts`, `draft-actions.ts`,
`form-state.ts`.

Every component ships loading, empty and error states or it does not ship.

---

## 5. Design tokens

The token layer in `src/app/globals.css` already satisfies the directive and
`docs/DECISIONS.md` D-016/D-017. **Reuse it; do not invent a parallel system.**

- **Neutrals:** `--color-paper #faf7f2`, `--color-paper-raised #ffffff`,
  `--color-paper-sunk #f2ede4`; `--color-ink #1c1917`,
  `--color-ink-muted #57534e`, `--color-ink-subtle #78716c`.
- **Single accent:** `--color-accent #7a1e2e` (deep claret), hover `#631825`,
  soft `#f5e7e6`. `--color-sage #4a5c4f` is a supporting neutral, not a second
  accent.
- Full dark theme already defined under `prefers-color-scheme: dark`.
- **Type scale:** fluid `clamp()` — display-1 `2.5rem → 4.5rem` (lh 1.04, ls
  -0.022em), display-2, heading-1, heading-2, body-lg, body, small, micro,
  eyebrow (ls 0.12em).
- **Spacing:** `--spacing: 0.25rem`, 8px rhythm. **Radius:** 0.25/0.375/0.625/1rem.
  **Motion:** `--ease-out-quiet: cubic-bezier(.22,1,.36,1)`, 140ms / 220ms.
  **Containers:** measure 42rem, content 68rem, wide 82rem.
- **Fonts:** Fraunces (variable, SOFT/WONK/opsz) + Instrument Sans, self-hosted
  via `next/font`, no runtime third-party request. *Justification:* Fraunces is
  warm and editorial with real personality without tipping into calligraphic
  wedding cliché, and Instrument Sans avoids the default-Inter look — Fontshare
  is blocked at this proxy, so licensed alternatives are not fetchable (D-017).

**One correction to make in P0:** the accent currently paints the homepage
eyebrow (`text-accent` in `src/app/(marketing)/page.tsx`). The directive is
right — if the accent appears on anything that is not a primary action, the
system is broken. Eyebrows move to `--color-ink-subtle`; accent is reserved for
primary actions and the focus ring.

---

## 6. Performance budget

**Measured, not assumed.** Baseline taken on the current build (Next 16.3.4,
Turbopack, production server, 390px mobile viewport, encoded wire bytes):

```
Shared framework baseline: 134.5 KB across 7 chunks

route          added JS   budget  first load   budget      total   budget  status
/                0.0 KB    10 KB    134.5 KB   145 KB   298.9 KB   800 KB  ok
/start           5.5 KB    25 KB    139.9 KB   160 KB   307.2 KB   500 KB  ok
```

**The directive's 120 KB first-load budget is below the framework floor.** React
19 plus the Next 16 App Router runtime is a fixed 134.5 KB gzipped, identical on
every route, and no discipline in this codebase moves it. Budgeting against 120
KB would leave the build permanently red for a reason nobody could act on.

So the headline metric is **route-added JavaScript** — what each route ships on
top of the shared floor, which is the number we actually control. The first-load
ceiling is kept as a backstop so a framework regression is still caught.

The baseline confirms the boundary discipline in `docs/ARCHITECTURE.md` is real:
the homepage adds **0.0 KB** (pure Server Components), and the 612-line inquiry
form client island costs **5.5 KB**. Nothing has leaked — Zod, Drizzle and the
crypto modules are all server-side, exactly as the `server-only` marker intends.

| Route | Added JS | First load | Total |
| --- | --- | --- | --- |
| `/` | ≤ 10 KB | ≤ 145 KB | ≤ 800 KB |
| Vertical pillars | ≤ 10 KB | ≤ 145 KB | ≤ 700 KB |
| `/plan` | ≤ 25 KB | ≤ 160 KB | ≤ 500 KB |
| `/venues`, `/venues/[slug]` | ≤ 20 KB | ≤ 155 KB | ≤ 900 KB |
| `/journal/[slug]` | ≤ 10 KB | ≤ 145 KB | ≤ 600 KB |

Site-wide: INP ≤ 200ms, CLS ≤ 0.05, Lighthouse mobile ≥ 95 on all four
categories. Hero image ≤ 180 KB AVIF, `priority` on the hero only, explicit
dimensions on every image, everything below the fold lazy. Public pages stay
Server Components — the only client islands are the planner, the mobile nav and
`<Reveal>`. GTM deferred; no render-blocking third-party script.

Enforced by `pnpm perf` (`scripts/perf-budget.mjs`), chained into
`pnpm verify:e2e`. It measures `request.sizes().responseBodySize` — the encoded
bytes actually sent — because `response.body()` returns the decompressed buffer
and over-reports a gzipped chunk by roughly 3x.

## 7. The single riskiest assumption

**That organic search is an acquisition channel for this site in year one.**

`docs/SEO_STRATEGY.md` records that every "hire a planner in [city]" head term
is aggregator-locked (The Knot, WeddingWire, Zola, The Bash, Thumbtack,
Eventective) for 18–24 months at zero domain authority, and that
`corporate event planner connecticut` is contaminated with job-seeker intent
because Indeed ranks on it. The entire "high volume of qualified inquiries"
goal therefore rests on channels this website cannot create by itself: Google
Business Profile, directory listings, referral and outbound.

What the build can honestly do is (a) win the venue-guide and cost corridors,
where independent photographer blogs with modest authority currently rank —
which is the wedge, and the reason the venue layer is the moat; (b) convert far
harder than the category once traffic arrives, which is what the planner is
for; and (c) instrument funnel drop-off from day one so the assumption is
testable rather than believed.

Second-riskiest: that a 5-step planner raises qualified submissions rather than
suppressing them versus the single-page form already shipped. Mitigated by
partial persistence (an abandonment at step 3 still yields data) and by
step-level telemetry that makes a 4-versus-5-step test a config change.

---

## 8. What I need from you

Not blocking the start of work — P0 through P3 proceed without any of it. Each
one unblocks a specific surface.

1. **Business phone + inbox** → `NEXT_PUBLIC_CONTACT_PHONE`,
   `NEXT_PUBLIC_CONTACT_PHONE_DISPLAY`, `NEXT_PUBLIC_CONTACT_EMAIL`,
   `INQUIRY_NOTIFICATION_EMAIL`. Unblocks the sticky mobile `tel:` header —
   a top-three conversion surface in the benchmark set.
2. **Fee structure** → your real bands and the variables that move cost. Ships
   as one typed source file. Unblocks `/pricing` and the estimator.
3. **Venue sheet** → CSV/Sheet, one row per venue, one row per fact in a second
   tab: `slug, name, town, region, venue_type, official_url, field_name, value,
   source_type, source_url, verified_at, confidence, note`. 10 venues clears
   Slice 4; the content gate rejects anything thinner. Source hierarchy per
   `docs/VENUE_DATABASE.md`: venue's own site > state agency > municipal code >
   maps > aggregator; never a competitor page, forum post, or inference from a
   photograph.
4. **Supabase project** → connection string for `DATABASE_URL`, plus `RESEND_API_KEY`
   and `EMAIL_FROM` when you want real email delivery. Until then the outbox
   records `no_provider` and the admin says so.
5. **Founder identity** (optional, highest leverage of the five) → real name,
   real photograph, bio, credentials. `/about` ships without it; the module
   stays dark until it is real.

---

## Build order

Each phase ends with: `pnpm verify` (typecheck + lint + test + build) shown not
asserted, Lighthouse mobile on the affected routes, and the Definition of Done
checked item by item. No phase starts while a previous check fails.

**P0 — Foundation reconciliation.** Commit `PLAN.md` to the repo root. Measure
and record baseline bundle sizes and Lighthouse. Set contact env vars. Fix the
accent-discipline violation. Add `<Reveal>`, the extended primitive set, the
sticky mobile CTA header. Generalise `scripts/verify-slice1.mjs` into a shared
page-contract checker (heading order, one `h1`, canonical, indexability, 375px
overflow, D-013 banned-phrase scan) that every public route runs against. Add
the orphan-link check and the perf-budget assertion to `pnpm verify`.

**P1 — The planner.** The product. Schema migration; `/plan` with five steps and
a visible progress indicator; partial persistence on every step transition;
scope tier and add-on modules; anchored budget bands; step telemetry;
Turnstile pluggable and inert; `/thank-you`; `/start` → `/plan` redirect.
Detailed architecture in the section below.

**P2 — Homepage.** Tier 4 rebuild: hero, positioning, four verticals, process,
objection handling, proof modules in their deliberate empty states, one repeated
primary CTA. One optimised still, motion after paint, no carousel.

**P3 — Four vertical pillars.** Hand-written, four separate pieces of writing,
never templated. Each ends with a planner entry pre-filled with its event type
via a server-validated query param. The wedding page treats shuttle logistics as
demonstrated competence only, in coordinating verbs.

**P4 — Trust surface.** `/how-we-work`, `/contact`, `/pricing` + estimator (on
your numbers), `/about` with the founder module dark, `/privacy`, `/terms`,
`/accessibility`. The vetting standard ships only as what is genuinely done, in
the present tense — publishing an unperformed check is both a CUTPA deception
and a voluntary-undertaking liability (D-013).

**P5 — Venue and location layer.** Venue + provenance schema, `assertPublishable()`
gate with unit tests, importer for your sheet, `/venues` directory with filters,
`/venues/[slug]`, `/guides/[region]`, `generateStaticParams`, audit-logged admin
edits.

**P6 — SEO layer.** `Organization` sitewide with `areaServed` and no `address`;
`BreadcrumbList` on nested routes; `Article`/`WebPage` on venue pages with the
venue as a nested non-primary `Place` only. **No `LocalBusiness`, no `Review`,
no `AggregateRating`, no `FAQPage`, no `Event`** — each is dead weight or a
manual-action risk and all four are fabrication surface (D-012). Gated sitemap,
generated OG images, `llms.txt`, the cost/budget journal corridor.

**P7 — Admin and operator workflow.** Status/vertical/overdue filters, search,
timestamped notes, assignment, SLA dashboard, **funnel drop-off by step**,
notification retry, CSV export, pagination that holds at 1,000+ rows.

**P8 — Hardening and launch.** Perf pass against the budget table, WCAG 2.2 AA
audit including full keyboard and screen-reader completion of the planner,
security review, error/404/500 states, analytics verification, deploy,
monitoring, Search Console, sitemap submission.

---

## Planner architecture

**Progressive enhancement — one form, two experiences.** `/plan` is a Server
Component rendering a single `<form>` containing five `<fieldset>`s with real
labels and inputs. A client shell (`planner-form.tsx`) marks non-active
fieldsets `hidden` **and** `inert`, and renders the progress indicator plus
Back/Next. With JavaScript disabled all five fieldsets are visible and one
submit posts to the same Server Action — byte-for-byte the behaviour `/start`
ships today. One code path, one schema, no duplicated validation.

*Rejected:* a route per step with server-side step state (five round-trips, five
tokens, anonymous server state, and full page loads that flatten the
goal-gradient effect); URL search-param steps (works without JS only over GET,
which leaks answers into URLs, referrers and analytics, and cannot be
rate-limited the same way).

**Partial persistence.** `POST /api/draft` — a Route Handler, **revised from the
Server Action this plan originally specified**. Every Server Action invocation
makes Next refresh the route it was called from; on `/plan`, which is
force-dynamic, that re-render reconciled into a form the customer was actively
typing into, and in testing it landed between two keystrokes and emptied the
name fields that had just been filled. The submission then failed validation for
fields the customer had demonstrably completed. Losing a customer's typing to a
background save of reporting data is not a trade worth making. The handler
applies the identical checks in the identical order, so the only thing given up
is the shared idiom.

- *Identity:* an httpOnly, `SameSite=Lax`, 12h `neep_draft` cookie holding a
  random token. The database stores only `hmac()` of it (`security/hash.ts`),
  never the raw value — the same discipline as session tokens and IPs.
- *Rate limit:* a new `RATE_LIMITS.draftPerIp` bucket at ~60/hour via the
  existing `consumeRateLimit`. Five writes per completed flow leaves ample room
  for retries and shared IPs without opening an abuse channel. Fails open, like
  every other limiter.
- *Token:* `verifyFormToken` under a distinct `"planner-draft"` scope. Its
  2500ms `MIN_AGE` would wrongly reject a fast step 1, so `verifyFormToken`
  gains an optional `{ minAgeMs }` argument defaulting to today's behaviour;
  the draft scope passes `0`. Final submit keeps the full timing check.
- *Transport:* `fetch(..., { keepalive: true })`, fire-and-forget. `keepalive`
  so a save started as someone closes the tab still completes — an abandoned
  funnel is precisely the case this feature exists for, and it is the one where
  the page is going away.
- *Reconciliation:* `submitPlan` resolves the draft by cookie hash and writes
  `inquiries.draft_id` in the same insert. `draft_id` is **unique**, so exactly
  one inquiry per draft is a database guarantee, not a convention. The draft is
  marked `converted`. A missing cookie (cleared, or the no-JS path) yields
  `draft_id = null` — no lead lost, only funnel linkage.
- *Abandonment* is derived at read time (`status = active` and
  `updatedAt < now() - 30 minutes`), not by a scheduler. No cron dependency.

**Validation layering.** `inquiryInputSchema` stays the single authoritative
schema. Per-step schemas are `inquiryInputSchema.pick({...})` per step; draft
saves apply `.partial()` to the picked shape so a half-filled step still
persists. Final submit runs the full schema, unchanged. Nothing is duplicated.

**Telemetry.** `saveDraft` writes `funnel_events` on enter/exit; `submitInquiry`
writes `submit`. `ipHash` only, from the existing `getRequestContext()`.
Drop-off by step is one `GROUP BY`, surfaced in admin in P7.

**Turnstile, pluggable and currently inert.** `src/lib/security/turnstile.ts`
mirrors the `src/lib/notify/index.ts` pattern: with no keys configured,
`turnstileConfigured()` is false, the widget never renders, and `verifyTurnstile`
returns `{ configured: false, ok: true }`. With keys, verification slots in
after the form token and before Zod. Admin shows which spam controls are
actually live — never a green tick for a provider that is not there.

**Three biggest risks.** (1) Five steps could suppress submissions relative to
the one-page form already working — mitigated by step telemetry and by making
step count a config change, so 4-vs-5 is a test not a rewrite. (2) Draft writes
widen the public write surface and a bot can cheaply create rows — mitigated by
the draft bucket, the scoped token, drafts carrying no PII so the blast radius
is junk rows, and a retention sweep. (3) All five steps live in the DOM, so
autofill and screen readers could wander into hidden steps — mitigated by
`hidden` + `inert` rather than CSS `display`, and proven by a keyboard-only
Playwright pass.

---

## Verification

Per phase:

1. `pnpm verify` — typecheck, lint, 84+ Vitest tests against real Postgres, build.
2. `pnpm verify:e2e` — Playwright page-contract checks across every public route.
3. Lighthouse mobile on affected routes; numbers recorded in `docs/PHASE_PLAN.md`.

Specific to the planner:

- **JS-disabled submission.** Playwright with JavaScript disabled completes
  `/plan` end to end and a row lands in `inquiries`.
- **Abandoned funnel.** Reach step 3, close the page, assert exactly one
  `inquiry_drafts` row with `furthestStep = 3`, `status = abandoned`, and **no
  PII columns populated**.
- **Draft reconciliation.** Complete the flow after abandoning twice; assert
  exactly one `inquiries` row and one `inquiry_drafts` row marked `converted`.
- **Keyboard only.** Full planner completion with no pointer.
- **Content gate.** Unit tests prove a thin venue record is excluded from
  `sitemap.ts` and renders `noindex`; a passing record does neither.
- **Legal copy scan.** The banned-verb check fails the build on "we provide
  transportation", "our fleet", "our vehicles", "our drivers", or "Fleet" as a
  nav label.
- **No secrets in client bundles**, re-asserted after every phase.
