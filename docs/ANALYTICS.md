# Analytics and measurement

## Position

**Attribution is first-party, server-side and dependency-free.** No third-party
analytics SDK is installed, and none is needed for the questions that currently
matter.

Rationale: a client-side tag under-reports exactly the privacy-conscious,
ad-blocking segment, and at this volume the decisive questions — where did this
lead come from, and did we answer it in time — are answerable from our own
database with more accuracy than any tag would give. See `docs/DECISIONS.md`
D-007.

## What is captured

Set by `src/proxy.ts` on every document request, into three HttpOnly
first-party cookies. No third party is contacted; no cross-site identifier is
set.

**First touch** (`neep_ft`, 1 year, written once, never overwritten) — how they
found us, ever. Landing path, referrer and referrer host, all five UTM
parameters, ad click id and its platform.

**Last touch** (`neep_lt`, 90 days) — the same fields, but overwritten **only**
by a visit carrying campaign intent: a UTM, an ad click id, or an external
referrer. A later direct visit does not erase the campaign that drove them.
That rule is what makes paid spend measurable.

**Visit state** (`neep_v`, 1 year) — an opaque visit id and a count of distinct
visits, where a visit is separated by a 30-minute gap.

**At submission**, additionally: the path the form was submitted from, the user
agent, and a keyed HMAC of the client IP. **The raw IP is never stored.**

Recognised click ids, in priority order: `gclid`, `gbraid`, `wbraid` (Google),
`msclkid` (Microsoft), `fbclid` (Meta), `ttclid` (TikTok), `li_fat_id`
(LinkedIn).

## Where it surfaces

- **Admin list:** a resolved source column — UTM source/medium, else referrer
  host, else "Direct" — joined in the same query, no N+1.
- **Admin detail:** the full first-touch and last-touch record side by side,
  plus session and visit count. When no attribution row exists, the page says so
  plainly rather than rendering blanks.

## The questions this is built to answer

1. Which channel produced this specific booking?
2. Which channels produce inquiries that convert, versus inquiries that waste
   time? (First touch versus last touch, against final status.)
3. How many visits does a wedding lead take before submitting?
4. Which pages produce inquiries, and do venue pages beat the site average?
5. Are we meeting the response commitment we publish?

Question 5 is instrumented end to end today: `response_due_at` per inquiry, an
overdue count, and per-row flags. Median first-response time arrives in Slice 5.

## Deliberately not measured yet

**Total traffic.** At zero domain authority it is a vanity number that would
encourage the wrong content. Measure inquiries per page type instead.

**Rankings for service head terms.** Aggregator-locked; tracking them would
create pressure to chase an unwinnable corridor. Track the venue-guide and cost
corridors instead — `docs/SEO_STRATEGY.md`.

## Privacy posture

- No third-party analytics, no advertising pixel, no cross-site identifier.
- Cookies are first-party, HttpOnly, `SameSite=Lax`, and readable only by our
  own server.
- IPs are stored only as keyed HMACs.
- `Referrer-Policy: strict-origin-when-cross-origin` — full URL same-site, origin
  only cross-site.
- `Permissions-Policy` disables camera, microphone, geolocation and
  `interest-cohort`.

Because no third-party tracker is set, a consent banner is not currently
required for the mechanism itself. **Re-assess before adding any advertising
pixel** — that changes the analysis, and the answer will likely be a real
consent gate rather than a banner that does nothing.

## Adding measurement later

If a platform pixel becomes necessary for ad optimisation, prefer **server-side
conversion APIs** fired from the inquiry action over a client-side pixel: more
accurate, no consent-degraded client tag, no third-party script in the critical
path, and no impact on INP. The inquiry record already holds the click id needed
to attribute a server-side conversion.

## Data retention

Not yet defined — a real gap. Before volume arrives, decide and document how
long inquiry and attribution records are kept, and implement pruning.
`pruneRateLimits()` and `pruneExpiredSessions()` exist for the operational
tables but are not yet scheduled.
