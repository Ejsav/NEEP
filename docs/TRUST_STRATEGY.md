# Trust strategy — the zero-proof system

This company launches with no social proof and is forbidden from inventing any.
That is not a marketing problem to work around; it is the design brief.

The premise: **the substitutes below are first-class product features, not
placeholders.** Several of them are stronger than the reviews they replace,
because almost nobody in this market offers them.

Every component that would normally hold social proof has two specifications
here: the **honest empty state** it ships with, and the **upgrade path** that
turns on automatically once real data exists.

---

## The six substitutes

### 1. Published pricing — *not yet live, blocked*

**Why it works.** RESEARCH OBSERVATION: roughly three of ten independent CT
planner sites surveyed publish real numbers. It pre-qualifies leads for free and
signals confidence.

**Honest empty state (current).** The inquiry form asks the customer for their
budget band and says nothing about ours. No figure appears anywhere on the site.

**Upgrade path.** Slice 7. The founder supplies a real fee structure; the
pricing page and estimator switch on. **No market-derived placeholder ever
renders** — see `docs/DECISIONS.md` D-018.

**Positioning caution.** RESEARCH OBSERVATION: The Knot and Thumbtack already
publish CT price bands at scale and outrank independents on those queries. This
is a **conversion and trust** differentiator, not an SEO one. It will win the
inquiry, not the ranking. Do not build the brand on it.

---

### 2. Named, visible founder — *not yet live, blocked*

**Why it works.** Founder-led beats faceless when there is no track record. A
real face is a real accountability claim.

**Honest empty state (current).** No person is depicted anywhere on the site.
There is no stock photograph of a "team". The absence is quiet, not papered over.

**Upgrade path.** Slice 2, on receipt of a real name, real photograph and real
bio. **A stock photo of a person is fabrication and must never ship**, however
tempting the empty space looks.

---

### 3. Published vendor vetting criteria — *not yet live, blocked*

**Why it works.** The vetting *is* the value proposition of a coordinator. A
customer who cannot judge a caterer can judge whether we have a standard.

**Honest empty state (current).** The site says we source and vet vendors on the
customer's behalf. It does not enumerate specific checks, because no vendor file
exists yet to back them.

**Upgrade path.** Slice 2, but **only** once a documented per-vendor file exists
containing the CT DOT permit number where applicable, the licence lookup with
its date, and the certificate of insurance with its expiry.

**Legal weight — read `docs/DECISIONS.md` D-013 before writing a word of this.**
Publishing "we verify insurance, licensing and references" converts a marketing
line into a performance promise with two independent failure modes: the
voluntary undertaking doctrine (Restatement (Second) of Torts §324A) plus
negligent selection, and CUTPA deception if the check is not actually performed
— exposing actual and punitive damages plus attorney's fees under CGS §42-110g.

State only what is genuinely done, in the present tense, and keep the file.

---

### 4. Process transparency — **LIVE**

**Why it works.** It converts when reviews do not exist, because it removes the
main fear: that submitting a form starts a sales sequence.

**Live now.**

- `/start` sidebar: the response commitment, that you will not be added to a
  drip sequence, the coordinator relationship, and the Connecticut-only scope.
- Homepage "How it works": three numbered steps, including that we will say if
  we are not a fit and point elsewhere.
- Success receipt: what happens next, in order, with the SLA number in it.

**Upgrade path.** Slice 2 expands this into a full `/how-we-work` page. As real
events complete, add median actual response time — a real number replacing a
promise is a strict upgrade.

---

### 5. Connecticut specificity — **PARTIALLY LIVE**

**Why it works.** Local competence is provable without claiming a single past
customer. It is the one form of authority a zero-proof company can legitimately
assert on day one.

**Live now.** Connecticut-only scope stated plainly, including that we will say
so if an event falls outside it. Town and venue fields in the inquiry form.

**Upgrade path.** Slice 4. The venue database is the main vehicle: verified
capacities, parking counts, curfews and drive times are competence made visible.
Seasonal reality (peak September–October, foliage-driven Litchfield pricing,
20–40% swing between January and September) is real, verifiable content.

**Caution.** RESEARCH OBSERVATION: `ctweddinggroup.com` already publishes CT
seasonal-pricing content and ranks for it. That content is table stakes, not a
differentiator. The venue-logistics depth is the differentiator.

---

### 6. Enforced response commitment — **LIVE, and genuinely enforced**

**Why it works.** Everyone claims fast response. Almost nobody instruments it.

**Live now, end to end.**

- `RESPONSE_SLA_HOURS` (default 24) is the single source of truth.
- Every inquiry gets `response_due_at` computed at insert.
- The published figure on `/start`, the homepage and the success receipt all
  read from that same value — the promise cannot drift from the system.
- The admin list shows a red **Overdue** badge per row and a count banner.
- The clock stops only on an explicit "Mark as responded" action. Opening a lead
  is not answering it, so viewing does not stop the clock.
- `countOverdue()` excludes spam and lost, so the number stays meaningful.

**Upgrade path.** Slice 5 adds median first-response time. Once that is
consistently under the promise, publish the measured number — a fact beats a
commitment.

---

## Component-by-component empty states

| Component | Honest empty state (now) | Upgrade trigger |
| --- | --- | --- |
| Homepage hero | Positioning and a CTA. No counts, no logos, no "trusted by" | Never — the hero stays claim-free |
| Social proof band | **Absent entirely.** No greyed-out placeholder, no "logos coming soon" | 3+ real, permitted client logos |
| Testimonials | **Absent entirely** | 3+ real, attributed, permitted testimonials |
| Star ratings | **Absent, and structurally forbidden** — see D-012 | Genuine third-party reviews displayed on-page. Even then, self-serve `AggregateRating` stays ineligible |
| Case studies | **Absent** | A completed event with written client permission |
| Team | **Absent.** No stock people | Slice 2, real founder assets |
| Vendor logos | **Absent** | Signed vendor agreements permitting use |
| "Events planned" counter | **Absent** | A real count, and only once it is not embarrassing |
| Press / "as seen in" | **Absent** | Actual coverage |
| Awards | **Absent** | Actual awards |
| Admin dashboard | Zero-state says "This is what zero looks like" and explains where leads appear | Automatic on first inquiry |
| Notification status | States plainly that no provider is configured | Automatic when `RESEND_API_KEY` and `EMAIL_FROM` are set |
| Contact details | Route omitted entirely if not configured — never a placeholder number | `NEXT_PUBLIC_CONTACT_*` set |

**The empty-state rule.** An absent section is better than a section that
advertises its own emptiness. "Testimonials coming soon" tells a visitor you
have no customers *and* that you thought about hiding it. Ship the page without
the section, and add the section when it has something in it.

---

## What the code enforces

Trust posture is not a copywriting convention here; parts of it are load-bearing
code.

- `src/lib/site-config.ts` types every contact route as possibly-null, so every
  consumer is forced to handle absence. There is no placeholder to accidentally
  ship.
- `src/lib/notify/index.ts` writes the notification row before any delivery
  attempt and records `no_provider` when unconfigured. The admin UI renders that
  as "Not sent — no email provider configured".
- `src/app/admin/inquiries/page.tsx` shows a standing banner when email is
  unconfigured. A dashboard that looks healthy while email is silently off is
  how leads go cold.
- `src/app/(marketing)/page.tsx` emits `Organization` only — no address, no
  rating (D-012).
- `scripts/verify-slice1.mjs` scans rendered pages for fabricated-proof terms
  and for banned carrier language, and fails the build-verification run if any
  appear.
