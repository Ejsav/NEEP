# New England Event Planners — project constitution

Loaded on every turn. Keep under 200 lines. Pointers, not content.

## What this company is

A Connecticut-first event services company that owns the customer relationship
and coordinates fulfilment through internally vetted third-party providers.
Positioning: **one place to start planning, instead of hunting down and
coordinating every vendor yourself.**

Scope is exactly four verticals. Nothing else ships.

1. Weddings
2. Corporate events
3. Private events
4. Venue & vendor coordination

The company starts from **zero**: zero traffic, zero domain authority, zero
completed events, zero reviews, zero case studies, zero vendors on file. That is
a design constraint, not a secret to hide.

## What this company is not

- **Not a transportation operator.** It owns no vehicles, employs no drivers,
  holds no carrier authority and carries no operator's insurance.
- **Not a multi-brand site.** New England Event Planners LLC holds other DBAs.
  They are unrelated brands, different audiences, different domains. Never
  reference, link to, build toward, or target their keywords. The only
  connection is the legal entity, and it surfaces only in terms, privacy and
  contracts.
- **Not operating outside Connecticut.** Architecture supports MA/RI/NH/VT/ME.
  Public copy must never imply current operations there.

## The four hard constraints

These override conversion optimisation, design preference and my own judgement.

### 1. No fabrication

Never invent reviews, testimonials, customers, logos, completed events, awards,
press, offices, staff, vendors, vehicles, licences, insurance, carrier
authority, partnerships, venue relationships, availability, statistics or case
studies. If real data does not exist, build the honest empty state.
→ `docs/TRUST_STRATEGY.md`

### 2. Transportation honesty

CGS §13b-101 defines livery service by whether a business **"represents itself
to be in the business of transporting passengers for hire."** The trigger is
advertising conduct, not ownership. Penalty runs to $1,000 per day per
violation.

- **Allowed verbs:** coordinate, arrange, manage, source, schedule.
- **Banned verbs with "we" as subject:** provide, offer, operate, run, drive,
  supply.
- **Never publish:** "our fleet", "our vehicles", "our drivers", "we provide
  transportation", "we offer shuttle service", "Fleet" as a nav label, or
  "licensed and insured" describing *the company* in a transportation context.
- Vehicle imagery needs an adjacent "representative" caption or must not appear.
- The footer disclosure is legally load-bearing. Do not soften or remove it.

Full allowed/forbidden list and the sources: `docs/DECISIONS.md` § Legal.

### 3. Evidence classes

Label every research conclusion in documentation as **VERIFIED FACT**,
**RESEARCH OBSERVATION**, **STRATEGIC INFERENCE** or **RECOMMENDATION**. Never
present inference as fact.

### 4. No doorway pages

Never generate pages by substituting town names into a template. A location or
venue page ships only if it contains substantial location-specific usefulness.
If it cannot, do not publish it.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.3.4, App Router, Turbopack |
| UI | React 19.2.8, TypeScript 5.9 strict, Tailwind CSS v4 |
| Database | PostgreSQL + Drizzle ORM 0.45 (postgres.js driver) |
| Validation | Zod v4 — note `z.email()`, `z.flattenError()`, not v3 syntax |
| Auth | Server-side sessions, scrypt hashing. No third-party auth provider. |
| Email | Resend over `fetch`, optional. Absent = recorded, not sent, and said so. |
| Tests | Vitest 5 against real PostgreSQL + Playwright for browser checks |

Pinned deliberately, not by accident: **TypeScript 5.9** (typescript-eslint does
not support TS 7) and **ESLint 9** (eslint-config-next 16 breaks on ESLint 10).
Reasons and revisit conditions in `docs/DECISIONS.md`.

## Commands

```bash
pnpm dev              # dev server
pnpm build            # production build (fails on type errors)
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest, needs DATABASE_URL
pnpm verify           # typecheck + lint + test + build
pnpm verify:e2e       # browser checks; needs a built app on :3000
pnpm links            # internal link graph; no page reachable only from chrome
pnpm db:generate      # generate a migration from schema.ts
pnpm db:migrate       # apply migrations
pnpm admin:create     # create/update an admin (env-driven, no defaults)
```

`pnpm test` and `pnpm verify:e2e` need `.env.local`. See `.env.example`.

## Definition of done

A slice is done when **all** of these hold. Not most.

1. `pnpm verify` passes, with output shown, not asserted.
2. Every acceptance criterion in `docs/PHASE_PLAN.md` for that slice is checked
   off explicitly, one by one.
3. 375px viewport, no horizontal overflow.
4. Every flow touched is completable with the keyboard alone.
5. No console errors.
6. Public pages touched: correct metadata, canonical, indexability, heading
   order with exactly one `h1`, no orphan.
7. No secrets in client bundles or committed files.
8. Nothing previously working regressed.

## Never ship

Lorem ipsum. Placeholder names. Fake data, stats or dashboards. Dead forms.
Empty CTAs. A TODO in a critical flow. A mock API presented as real. Console
errors. Disabled authentication. A phone number or address that is not real.

## Non-negotiable engineering rules

- **Server-side validation is authoritative.** Browser validation is a courtesy.
- **A Server Action is a public POST endpoint.** Rate-limit, verify the form
  token and re-authorise inside every action. Layout gating is not a boundary.
- **A lead must never silently disappear.** Persistence failure shows the
  customer a real error plus a direct contact route, and logs an incident id.
- **Vendor cost and margin data never reaches a client payload or public API.**
- **Never store a raw client IP.** Keyed HMAC only.
- WCAG 2.2 AA. Core Web Vitals at p75: LCP < 2.5s, INP < 200ms, CLS < 0.1.

## Design

Tier 4 — product/SaaS precision, in a warm regional register. Restraint is the
flex. Consume design tokens from `src/app/globals.css`; never invent a value in
a component. Rejected on purpose: template wedding aesthetics, SaaS gradients,
glassmorphism, nightclub styling. Mobile is the primary journey.

## Documentation map

Read these when the work touches them. Do not read them all up front.

| File | Read it when |
| --- | --- |
| `docs/PHASE_PLAN.md` | **Start of every session.** Picks the next slice. |
| `docs/DECISIONS.md` | Changing a dependency, an approach, or asking "why is this like this" |
| `docs/PROJECT_SPEC.md` | Scope, audience, or business-rule questions |
| `docs/ARCHITECTURE.md` | Adding a module, route group, or boundary |
| `docs/DATA_MODEL.md` | Any schema change |
| `docs/VENUE_DATABASE.md` | Anything touching venue records |
| `docs/TRUST_STRATEGY.md` | Any component that would normally hold social proof |
| `docs/SEO_STRATEGY.md` | New public pages, metadata, internal linking, schema |
| `docs/CONTENT_MODEL.md` | Writing or structuring published copy |
| `docs/SECURITY.md` | Auth, forms, secrets, rate limiting, PII |
| `docs/ANALYTICS.md` | Attribution, events, measurement |

Run `/audit` in a fresh session for an adversarial review against this file.
