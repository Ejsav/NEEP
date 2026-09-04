# Security

## Threat model

What actually matters here, in order:

1. **Lead loss.** A lost inquiry is lost revenue and a broken promise. This is
   the highest-severity failure in the system, above confidentiality.
2. **Customer PII disclosure.** Names, emails, phones, event dates and venues.
   An admin session can read every one of them.
3. **Admin account takeover.** Grants (2) and the ability to alter records.
4. **Spam and abuse.** Degrades the SLA promise by burying real leads.
5. **Vendor cost and margin disclosure.** Not yet in the schema. When it lands,
   it must never reach a client payload or a public API.

Explicitly *not* the model: this is not a payment system and stores no card
data. Do not add card storage without redoing this document.

---

## Authentication

**Design.** Server-side sessions. The cookie holds an opaque random token; only
its SHA-256 is stored, so a database leak yields no usable session.

- `scrypt` (N=2^15, r=8, p=1, 64-byte output, 16-byte random salt). Self-
  describing stored format `scrypt$N$r$p$salt$hash`, so a future algorithm can
  be added and rehashed on next login without a migration.
- Two expiry clocks: **absolute 12h** (hard ceiling regardless of activity) and
  **idle 2h** (rolls forward on each authenticated request).
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and the
  **`__Host-` prefix in production** — which requires exactly those attributes
  and no `Domain`, preventing a subdomain from setting it.
- Deactivating a user takes effect on their **next request**, not at expiry:
  `getCurrentAdmin()` joins to `admin_users` and rejects `is_active = false`.
- Revocation is immediate — sessions are rows, not stateless tokens.

**Enumeration resistance.** The unknown-account path still runs a full password
verification against a dummy hash, so response timing does not reveal which
emails are registered. Wrong password, unknown account and deactivated account
all return the identical string: *"Those credentials didn't work."*

**No default credentials exist anywhere in this codebase.** `pnpm admin:create`
is env-driven and refuses a password under 12 characters. There is no seed
script that creates a known account.

**Rate limiting on login.** Two axes, both required: per source IP (10 / 15 min)
and **per submitted account** (5 / 15 min). The per-account limit is what stops
a distributed attack spreading guesses across many IPs against one known inbox.
The account key is stored as an HMAC, so the rate-limit table never becomes a
list of admin email addresses.

---

## Authorization

**`requireAdmin()` is called at the top of every admin page and every admin
action — not only in the layout.**

This is deliberate and non-negotiable. A Server Action is a public POST endpoint
reachable by anyone who can construct the request; it does not inherit the
layout that rendered its form. Next's own documentation is explicit that
render-time gating is not a security boundary. Every mutation in
`src/app/admin/actions.ts` re-checks authorization itself.

Submitted enum values are re-validated server-side even when they came from our
own `<select>` — see `isAllowedStatus()`.

---

## Input handling

**Server validation is authoritative.** `src/lib/validation/inquiry.ts` is the
only thing that decides whether a submission is valid. Browser validation is a
usability courtesy; the form even sets `noValidate` so the server path is the
one that runs.

- Every enum is validated against a canonical list, so a hand-crafted POST
  cannot introduce a value the business does not recognise.
- Free text is control-character stripped, whitespace collapsed, and
  length-capped to the column width.
- Dates are bounded, not merely parsed — a date in the past or beyond a
  five-year horizon is a typo or a bot.

**On injection.** Sanitisation here is hygiene, not the defence. React escapes
on render and Drizzle parameterises every query. Note the one place this was
nearly lost: `countOverdue()` originally interpolated a JS `Date` into a raw
`sql` template, which postgres.js binds as a string against a `timestamptz`
parameter and throws at runtime. It is now built from typed operators. **Prefer
typed operators over raw `sql` templates.**

---

## Spam resistance without CAPTCHA

Four layers, none of which asks a real customer to prove they are human:

1. **Honeypot.** A plausibly-named field (`company_website`), positioned
   off-screen, zero-opacity, `aria-hidden`, and `tabindex="-1"` — invisible to
   sighted users, to screen readers, and to keyboard navigation alike.
2. **Signed form token.** One HMAC doing three jobs: CSRF defence beyond Next's
   built-in Origin check, a minimum fill time (submissions under 2.5s are
   scripted), and staleness (tokens expire after 12h, bounding how long a
   harvested token stays useful). Clock skew is tolerated — a negative age is
   treated as valid, not as an attack.
3. **Rate limiting.** Per IP (5/hour) and global (200/hour) on the inquiry form.
4. **Content heuristics.** Deliberately conservative — a false positive here
   silently loses a real customer, so only patterns a genuine inquiry would not
   produce are flagged.

**Rejected bots receive a decoy success response**, identical to a real one, so
they learn nothing about which layer caught them.

---

## PII handling

**Client IP addresses are never stored raw.** They are stored as a keyed HMAC
(`hashIp`), truncated to 32 hex characters — enough to correlate abuse, not a
retained network identifier. This applies to inquiries, sessions and the audit
log alike, and the browser verification suite asserts no raw IP renders in
admin.

**IP header trust.** `src/lib/security/request-context.ts` reads, in order:
`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`.
The first two are platform-set and unspoofable behind their respective proxies;
`x-forwarded-for` **is** spoofable if the app is reachable directly, so it is
last and only its left-most entry is read. **If the deploy target changes,
revisit this list** — trusting the wrong header turns per-IP rate limiting into
a no-op.

When no IP resolves, requests fall into a shared bucket rather than being exempt.

**Data minimisation.** Admin read models select explicit column lists, not whole
rows, so a future cost or margin column cannot leak into a payload by default.

---

## Secrets

- `APP_SECRET` keys every HMAC (form tokens, IP hashing, login rate-limit keys)
  and must be at least 32 characters. `src/lib/env.ts` throws loudly at first
  use rather than failing silently at request time.
- `src/lib/env.ts` and every module that reads it are marked `server-only`. This
  is enforced, not aspirational: the build failed during Slice 1 precisely
  because a client component imported two string constants from a server-only
  module. They now live in `src/lib/security/form-fields.ts`.
- `.env*.local` is git-ignored. `.env.example` documents every variable with no
  real value in it.
- `scripts/verify-slice1.mjs` reads its secret needles from the live environment
  and asserts they are absent from the served client JavaScript, so it checks
  the **actual** secrets in use rather than hard-coded examples.
- No credential appears in any committed file, including test fixtures.

---

## Response headers

Set in `next.config.ts` for every route:

| Header | Value | Why |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | The site is never legitimately framed |
| `X-Content-Type-Options` | `nosniff` | MIME confusion |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Keeps our own attribution working without leaking paths to third parties |
| `Permissions-Policy` | camera/mic/geolocation off | Nothing needs them |
| `X-Robots-Tag` (on `/admin/*`) | `noindex, nofollow` | Belt and braces with the route-level directive |

`poweredByHeader` is disabled — `X-Powered-By` tells an attacker the stack for
free.

**Not yet set: Content-Security-Policy.** This is a known gap. It is not
included as a header-only string because a CSP that is not tested against the
real bundle is worse than none — it either breaks the site or is so permissive
it is theatre. It needs its own slice with nonce plumbing for the inline JSON-LD
script.

---

## Audit logging

`audit_log` records login success and failure, logout, and every admin mutation,
with the actor, the entity, the hashed IP and a metadata blob. `actorLabel` is
denormalised so the record survives the user row being deleted. Audit writes
never throw — logging must not break the operation it records.

---

## Known gaps

Stated plainly rather than left implicit.

1. **No Content-Security-Policy.** Needs a dedicated slice. Highest-priority gap.
2. **No automatic notification retry.** Failed rows are visible in admin but sit
   there until Slice 5.
3. **Rate limiting fails open** on a database error. Deliberate — an outage must
   not silently drop a lead — but it means a database outage is also a rate-limit
   outage.
4. **Attribution cookies are unsigned.** Accepted; every field is re-validated on
   read. See `docs/DECISIONS.md` D-007.
5. **No MFA on admin.** Appropriate at one or two users; revisit before the
   third.
6. **No automated dependency scanning** in CI. There is no CI yet.
7. **Fixed-window rate limiting** allows up to 2× the limit across a window
   boundary. Accepted at these limits.
