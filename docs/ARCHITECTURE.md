# Architecture

## Shape

A modular monolith. One Next.js 16 App Router application containing the public
marketing site, the venue database (to come) and the admin area, separated by
route group and module boundary rather than by service. Reasoning and revisit
conditions: `docs/DECISIONS.md` D-001.

```
src/
  app/
    layout.tsx            Root: fonts, metadataBase, title template, viewport
    globals.css           Design tokens. The single source of visual truth.
    icon.svg              App icon (Next generates the link tag)
    robots.ts sitemap.ts  Generated, list only routes that exist
    (marketing)/          Public. Server Components, header + footer chrome.
      page.tsx            Homepage
      start/              The money path: page, form, action, form-state
    admin/                Authenticated. noindex at the layout level.
      layout.tsx          Sets robots noindex for everything beneath
      actions.ts          Admin mutations; each re-checks authorization
      login/              page, form, action, form-state
      inquiries/          List and [id] detail
  components/
    ui/                   Primitives: button, field
    site/                 Public chrome: header, footer
    admin/                Admin chrome: admin-bar
  lib/
    env.ts                server-only. Throws loudly on missing required vars.
    site-config.ts        Public company facts. Nulls where unknown.
    db/                   Drizzle client + schema
    domain/               Canonical option sets shared by UI and validation
    validation/           Zod schemas. Authoritative.
    security/             hash, form-token, form-fields, rate-limit, request-context
    attribution/          Touch model + cookie codec (edge-safe)
    inquiries/            create, queries, reference
    auth/                 session, guard
    notify/               Notification outbox
  proxy.ts                Attribution capture on every document request
```

## Boundaries that matter

**`server-only` is a real boundary, not a convention.** `lib/env.ts` and
everything that reads a secret carries the marker. The build fails if a client
component imports transitively — which it did during Slice 1, catching a
client component pulling in the crypto module for two string constants. Those
now live in `lib/security/form-fields.ts`, which has no imports at all.

**`lib/attribution/types.ts` must stay edge-safe.** It runs in `proxy.ts`, so
no Node built-ins and no `server-only`.

**`"use server"` modules export only async functions.** Constants and types live
in a sibling `form-state.ts`. This is a hard build error, not a style rule.

**Client boundaries stay at the leaves.** Pages and layouts are Server
Components. Only the two forms are `"use client"`, so public pages ship
essentially no JavaScript, which is what protects INP.

## Request flow: an inquiry

```
GET /?utm_source=...&gclid=...
  proxy.ts              parses URL + Referer, writes neep_ft / neep_lt / neep_v
  (marketing)/page.tsx  Server Component, static

GET /start
  page.tsx              force-dynamic; mints a signed form token
  inquiry-form.tsx      client island, useActionState

POST (Server Action: submitInquiry)
  1  honeypot            -> decoy success
  2  rate limit          per IP, then global      (cheap rejections first)
  3  form token          CSRF + timing + staleness
  4  zod validation      authoritative
  5  spam heuristics     -> decoy success
  6  createInquiry       inquiry committed FIRST, attribution best-effort after
  7  notifyNewInquiry    row written before any send; never throws
  -> success receipt with reference + SLA, or an honest failure with an incident id
```

Order is deliberate: nothing touches the database until the cheap checks pass.

## Data flow: reading a lead

```
GET /admin/inquiries
  requireAdmin()        session lookup + idle-window slide; redirects if absent
  listInquiries()       explicit column list, LEFT JOIN attribution
  countOverdue()        typed operators, excludes spam/lost
  -> table at >=1024px, cards below; both in the DOM, one hidden by CSS
```

## Failure posture

Each dependency has a defined behaviour when it is unavailable, chosen so that
**losing a lead is always the worst outcome**:

| Failure | Behaviour |
| --- | --- |
| Rate-limit table unavailable | **Fail open.** An outage must not drop a lead. |
| Attribution write fails | Logged; lead is already committed; admin says so |
| Notification provider absent | Row stored `no_provider`; admin says so plainly |
| Notification send fails | Row stored `failed` with the error; lead unaffected |
| Inquiry insert fails | Honest error + direct contact route + incident id in logs |
| Reference collision | Retried up to 5 times before surfacing |
| Audit write fails | Logged, swallowed — never breaks the operation it records |

## Rendering strategy

| Route | Mode | Why |
| --- | --- | --- |
| `/` | Static | No per-request data |
| `/start` | `force-dynamic` | Mints a short-lived form token per render |
| `/admin/*` | `force-dynamic` | Session-dependent |
| `robots.txt`, `sitemap.xml` | Static | Derived from config |

`cacheComponents` / PPR is deliberately deferred to its own slice — D-011.

## Conventions

- Consume design tokens from `globals.css`; never invent a value in a component.
- Read models select explicit columns, never `select()` on a table with
  sensitive future columns.
- Prefer Drizzle typed operators over raw `sql` templates (see SECURITY.md for
  the runtime bug this prevents).
- Every admin action re-checks authorization itself.
