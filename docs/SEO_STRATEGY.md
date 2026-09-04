# SEO strategy

Scope: the four verticals only. **No transportation head terms, in any
cluster, ever** — that is a legal constraint (`docs/DECISIONS.md` D-013), not a
prioritisation call.

Evidence classes: **VERIFIED FACT**, **RESEARCH OBSERVATION**, **STRATEGIC
INFERENCE**. Nothing below is presented as fact unless it was seen first-hand.

> **Verification debt.** SERP research for this document was conducted with
> `WebFetch` blocked at the proxy, so findings come from live search results and
> their snippets, not from loading the pages. Venue capacities and URLs
> **must be re-verified against each venue's own site before publication.**

---

## The strategic position, stated plainly

**STRATEGIC INFERENCE, and it contradicts the intuitive plan.** At zero domain
authority, every "hire a [planner] in [city]" head term is a losing fight for
18–24 months. Those SERPs are held by The Knot, WeddingWire, Zola, The Bash,
GigSalad, Thumbtack, Eventective, Yelp, BBB and Cvent.

So the organic budget goes to the **informational and venue-guide corridors**,
which convert into the service pages. The service head terms are a **Google
Business Profile and directory-listing play, not an organic one.**

If the plan expects to rank for `wedding planner connecticut` in year one, the
plan will miss.

### What the SERPs actually looked like

**RESEARCH OBSERVATION**, page-1 composition by query family:

| Family | Composition | Verdict |
| --- | --- | --- |
| `wedding planner connecticut` | Aggregators on top, but independents *do* rank (ctweddinggroup, sarahbrehantevents, lunaandcharlie, jenstrunk, irenecoevents) | Contested |
| `corporate event planner connecticut` | Directory-locked — and **Indeed ranks**, so the intent is contaminated with job seekers | Avoid the head term |
| `event planner [Hartford/New Haven/…]` | The Bash, GigSalad, Eventective, GoodFirms, Yelp | Aggregator-locked |
| `wedding venues connecticut` | Mixed — but a venue's own site ranks twice, and a **photographer's blog ranks** | Contested |
| `how much does a wedding cost in connecticut` | News, wedding.report, and independent vendor blogs | **Winnable** |
| `wedding day of coordinator ct` | The Knot per metro, Thumbtack — but independents rank | Contested long tail |
| `[venue] parking / shuttle / capacity` | No dedicated page type ranks at all | See the warning below |

**The finding that changes the plan.** RESEARCH OBSERVATION: independent
**photographer blogs with modest authority** rank for CT venue-guide terms —
"60+ Best Wedding Venues in CT", "Top 50 Wedding Venues" and similar, across at
least seven different photography domains.

**STRATEGIC INFERENCE:** if photographers can win that corridor without
authority, so can we — with materially better content. That is the wedge.

---

## The venue-logistics warning

**RESEARCH OBSERVATION, and it is a negative finding worth stating loudly.**
Searches for per-venue logistics (`"[venue] parking shuttle capacity"`,
`reddit connecticut wedding venue parking shuttle curfew`) returned couples'
personal Zola wedding websites and generic directory pages. No Reddit threads
surfaced. No dedicated authoritative page ranked.

**STRATEGIC INFERENCE:** the *concern* is universal — the mature "questions to
ask a wedding venue" cluster is organised around exactly parking, shuttles,
curfew and vendor policy — but the *per-venue query* is not. Individual venue
logistics pages will not earn meaningful direct organic traffic.

They earn: long-tail `[venue] wedding` traffic where the venue name itself has
volume; **conversion lift**; AI/LLM citation; and internal link equity.

Build them for that. See `docs/DECISIONS.md` D-014.

---

## Keyword clusters

Priority is build order for a zero-authority domain.

### A. Weddings — Priority 1

**Cost and budget hub** *(winnable — least aggregator-locked family found)*
- average wedding cost Connecticut
- wedding cost [Hartford / Fairfield County / Litchfield / Mystic]
- what does a wedding planner cost in CT
- day-of coordinator cost Connecticut
- wedding budget breakdown Connecticut

**Seasonality** *(table stakes, not a differentiator — see caution below)*
- best month to get married in Connecticut
- CT fall foliage wedding dates
- off-season Connecticut wedding savings
- Litchfield Hills foliage wedding timing

**Service intent — long tail only**
- day-of wedding coordinator CT
- month-of coordination Connecticut
- partial planning [town] CT

**Do not target organically:** `wedding planner connecticut`,
`wedding planner [city] CT`. Google Business Profile and directory listings
instead.

**Caution.** RESEARCH OBSERVATION: `ctweddinggroup.com` already publishes CT
seasonal-pricing content well and ranks for it. Enter that cluster only with
something materially better, or skip it.

### B. Venue & vendor coordination — Priority 1 (the flagship)

**Regional guides** *(the wedge — this is where the photographers rank)*
- wedding venues Litchfield Hills / CT shoreline / Fairfield County / Mystic
- barn wedding venues CT
- waterfront wedding venues Connecticut
- castle and mansion wedding venues CT

**Venue records** *(conversion assets, not traffic assets)*
- [venue] wedding capacity / cost / guide / parking / preferred vendors

**Comparison and decision**
- [venue A] vs [venue B]
- small wedding venues CT under 100 guests
- CT venues that allow outside catering
- open-vendor-policy venues Connecticut
- tented wedding venues Connecticut

**Logistics and regulatory** *(low volume, high authority value)*
- Connecticut wedding noise ordinance by town
- wedding end times CT venues
- CT state park wedding rules
- hotel blocks near [venue]

**Vendor coordination**
- how to choose CT wedding vendors
- preferred vendor list: mandatory vs recommended
- CT wedding vendor timeline

### C. Private events — Priority 2

- milestone birthday party planner Connecticut
- anniversary party planning CT
- bar / bat mitzvah planner Connecticut
- graduation party planner [Fairfield County / Hartford]
- retirement party planning CT
- engagement party venues Connecticut
- holiday party planner Connecticut

### D. Corporate events — Priority 3 (hardest)

Target **venue-modified and occasion-modified** terms, never the head term.

- corporate holiday party venues Hartford / New Haven / Stamford
- company offsite venues Connecticut
- conference planning Connecticut
- product launch venue Fairfield County
- biotech / life sciences event planning New Haven
- insurance industry event planning Hartford
- nonprofit gala planning Connecticut

**RESEARCH OBSERVATION** on demand structure: corporate activity clusters in
Greater Hartford (insurance and financial services), the Fairfield County
finance corridor, and Greater New Haven life sciences anchored by Yale. Expect
corporate to come from relationships and GBP, not content.

---

## Technical SEO rules

**Structured data.** `Organization` sitewide with `areaServed`, no `address`.
`BreadcrumbList` wherever breadcrumbs are visible. `Article`/`WebPage` on venue
and guide pages. **Never** `AggregateRating`, `Review`, `FAQPage`, `Event` on a
service page, or `LocalBusiness` without a real published address. Full
reasoning and sources in `docs/DECISIONS.md` D-012 — including that FAQ rich
results were fully retired in 2026, so `FAQPage` has no upside at all.

**Rendering.** All indexable content server-rendered. Nothing that matters may
appear only after hydration. Keep `use client` at the leaves.

**Metadata.** `metadataBase` and `title.template` set once in the root layout.
Every public page sets its own `alternates.canonical`. Keep `generateMetadata`
free of request-time APIs so tags land in `<head>` rather than streaming into
`<body>` — Googlebot handles streamed metadata, but HTML-limited crawlers such
as link-preview scrapers do not.

**Indexability.** `robots.txt` allows all but `/admin`. The admin layout sets
`robots: { index: false, follow: false }` and `next.config.ts` adds an
`X-Robots-Tag` header — robots.txt is a request to crawlers, the meta directive
is what actually keeps pages out of an index. No accidental `noindex` anywhere
public: the page-contract check asserts this per route.

**Internal linking is architecture, not decoration.** Homepage → verticals →
`/start`. Venue pages → their region guide → the relevant vertical → `/start`.
Guides → venues they name. No orphan strategic pages; the sitemap lists only
routes that exist and are indexable.

**No doorway pages.** Never generate a page by substituting a town name into a
template. A location page ships only with substantial location-specific
usefulness. If it cannot, it does not publish.

---

## Named Connecticut venues for Slice 4

**RESEARCH OBSERVATION**, all SERP-derived. ✅ = the URL appeared as a result;
⚠️ = named in a snippet, canonical URL not directly observed. **Every capacity
figure below must be re-verified against the venue's own site before it is
published.**

**Shoreline / southeast.** Mystic Seaport Museum ✅ · Saltwater Farm Vineyard,
Stonington ⚠️ · Harkness Memorial State Park / Eolia Mansion, Waterford ⚠️ ·
Branford House, Groton ⚠️ · Guilford Yacht Club ⚠️ · Madison Beach Hotel ⚠️

**Connecticut River valley / Middlesex.** Saint Clements Castle & Marina,
Portland ✅ *(best-documented venue found — publishes room-by-room capacities)* ·
The Riverhouse at Goodspeed Station, Haddam ✅ · The Lace Factory, Deep River ⚠️ ·
Wadsworth Mansion, Middletown ⚠️ · Gillette Castle State Park ✅ *(CT DEEP
publishes tent and noise restrictions)* · The Barns at Wesleyan Hills ⚠️ ·
Lyman Orchards Golf Club ⚠️

**Hartford area / Farmington valley.** Aqua Turf Club, Plantsville ✅ · The
Society Room of Hartford ✅ · The Hartford Club ⚠️ *(flagged as no on-site
parking)* · Connecticut Convention Center ✅ · Connecticut Science Center ⚠️
*(flagged as no on-site parking)* · The Riverview, Simsbury ⚠️ · Avon Old Farms
Hotel ⚠️ · Wickham Park, Manchester ⚠️

**Litchfield Hills.** Winvian Farm, Morris ✅ · Interlaken Inn, Lakeville ✅ ·
South Farms, Morris ⚠️ · Mayflower Inn & Spa, Washington ⚠️ · The Grand Oak
Villa, Oakville ✅ *(publishes a shuttle policy)*

**Fairfield County.** Rolling Hills Country Club, Wilton ✅ · Woodway Country
Club, Darien ⚠️ *(member sponsorship required)* · Belle Haven Club, Greenwich ✅ ·
New Haven Lawn Club ⚠️ · The Whittemore at Vyne, Naugatuck ⚠️

**Sensitivity.** Publishing curfews, mandatory-vendor status or parking
shortfalls can antagonise the very venues whose referrals a new coordinator
depends on. Publish only publicly documented facts, cite the venue's own page,
and route any complaint to correction rather than argument.

---

## Measurement

Track per cluster, not in aggregate:

- Organic entrances by cluster (cost/budget, venue guides, venue records,
  vertical service pages)
- Inquiry rate per page type; venue pages measured against site average
- Rankings for `[region] wedding venues` and `[venue] wedding` — **not** for
  logistics terms, which D-014 predicts will not produce volume
- Share of inquiries with a resolvable first-touch source

**Falsification condition.** If after six months venue pages neither rank for
regional guide terms nor convert above site average, cut the programme rather
than expand it. That is written into `docs/PHASE_PLAN.md` as the gate on Slice 8.
