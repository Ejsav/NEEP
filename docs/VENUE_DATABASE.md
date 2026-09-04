# Connecticut Venue Intelligence Database

**Status: not built.** Slice 4 in `docs/PHASE_PLAN.md`. This document is the
spec.

## What it is, and what it is honestly for

A structured, genuinely useful public database of Connecticut wedding and event
venues, modelled on facts a planner actually needs and that couples cannot
easily assemble themselves.

**Read `docs/DECISIONS.md` D-014 before building this.** Research contradicted
part of the original premise, and the correction matters:

- **It is not a traffic engine.** RESEARCH OBSERVATION: per-venue logistics
  queries (`"[venue] parking shuttle capacity"`) show no evidence of meaningful
  search volume. Searches returned couples' personal wedding websites and
  generic directories.
- **The data is not as private as assumed.** Several CT venues already publish
  capacity, parking counts, end times and vendor policy on their own sites. The
  gap is **aggregation and normalisation**, not discovery — which means it is
  copyable by anyone with a scraper.
- **It is a conversion, credibility and AI-citation asset**, and a wedge into
  the **regional venue-guide corridor** — which RESEARCH OBSERVATION shows is
  winnable at low authority, because independent photographer blogs currently
  rank there.

So: build it, scope it to 25–40 venues with real depth rather than 200 thin
records, and justify it on conversion and credibility. Ten first, to measure the
true cost of verification before committing.

**It is not a directory and not a doorway system.** A venue record that cannot
carry substantial verified, venue-specific usefulness does not publish. There is
no template-and-substitute path.

---

## Field model

Every field below is nullable and every field carries provenance. **A field
without a source is not a field, it is a guess.**

### Identity
`slug`, `name`, `town`, `region` (shoreline / river valley / hartford /
litchfield / fairfield), `venue_type`, `official_url`, `latitude`, `longitude`.

### Capacity — by configuration, not a single number
`capacity_seated`, `capacity_standing`, `capacity_ceremony`,
`capacity_reception`, and `capacity_by_room` (jsonb: room name, configuration,
count). Room-level detail is the differentiator — Saint Clements Castle
publishes exactly this shape, and almost no aggregator reproduces it.

### Setting
`indoor`, `outdoor`, `both`, `tented_allowed`, `tent_restrictions`.

### Parking and access — the highest-value cluster
`parking_spaces`, `parking_notes`, `valet_available`, `shuttle_staging_notes`,
`load_in_notes`, `load_in_earliest_time`, `drop_off_notes`.

**Copy rule inside this cluster.** Shuttle and transport fields describe *venue
logistics*, never a service we offer. Allowed: "shuttle staging area accommodates
two 56-passenger coaches". Forbidden: anything implying we run the shuttle. See
`CLAUDE.md`.

### Timing constraints
`curfew_time`, `curfew_source` (venue policy vs municipal ordinance — the
distinction customers most need and least often get), `amplified_music_cutoff`,
`noise_ordinance_reference`.

### Vendors
`vendor_policy` (open / preferred / exclusive), `preferred_vendor_required`
(boolean — mandatory vs merely recommended is the question that actually costs
money), `in_house_catering`, `outside_catering_allowed`, `bar_policy`.

### Guest logistics
`nearest_hotels` (jsonb: name, distance_miles, url), `hotel_block_notes`,
`drive_times` (jsonb: from Hartford / New Haven / Stamford / Providence / Boston
/ NYC).

### Accessibility
`accessibility_notes`, `step_free_access`, `accessible_restrooms`.

### Seasonal
`seasonal_availability_notes`, `peak_season_months`, `off_season_months`.

### Provenance — required on every fact
```
venue_field_sources(
  venue_id, field_name,
  source_type,   -- venue_site | municipal_code | state_agency | maps |
                 -- direct_confirmation
  source_url,
  verified_at,
  confidence,    -- verified | reported | unknown
  note
)
```

---

## Sourcing rules

**Publish only what is verifiable from a public source or direct venue
confirmation.**

1. **Never guess a capacity or a parking count.** Mark it unknown. An incomplete
   honest record beats a complete fabricated one — this is the whole point.
2. **Cite the venue's own page** wherever the venue publishes the fact. It is
   the most authoritative source and the least contestable if challenged.
3. **Municipal ordinances** for curfew and noise, cited to the town code, and
   labelled as the *town's* rule rather than the venue's.
4. **State agency pages** (CT DEEP) for state park venues — for example, DEEP
   publishes tent restrictions that materially change what is possible.
5. **Drive times from Maps**, recorded with the date, and presented as
   approximate.
6. **Direct venue confirmation** is the only route for anything not published.
   Record who confirmed it and when.

### Source hierarchy
venue's own site > state agency > municipal code > maps > reputable aggregator >
**never**: a competitor's page, a forum post, or an inference from photographs.

### Re-verification
These facts decay — curfews change, vendor lists change, parking gets
reconfigured. Every record carries `verified_at`; anything older than 12 months
renders as "last confirmed [date]" rather than as current. Re-verification is
ongoing operational cost, not a one-time build, and Slice 4 exists partly to
measure that cost honestly before scaling to 40.

---

## Publication gate

A venue page publishes only when **all** hold:

- [ ] Name, town, region and official URL present and correct
- [ ] At least one verified capacity figure with a source
- [ ] At least four verified fields beyond identity
- [ ] Every published figure has a `source_url` and a `verified_at`
- [ ] No field marked `unknown` is rendered as a number
- [ ] The page contains venue-specific prose that a template could not produce
- [ ] Structured data is `Article`/`WebPage` authored by us plus
      `BreadcrumbList`; the venue appears only as a nested non-primary `Place`
      with `name` and `sameAs` — **never** `LocalBusiness` for a venue we do not
      own (D-012)

If a record cannot clear this gate, it stays unpublished. It does not ship as a
thin page "to be filled in later" — that is a doorway page.

---

## Presentation rules

- **Unknown is stated, not hidden.** "Parking capacity not confirmed" is
  credible; a blank row is not.
- **Distinguish venue policy from law.** "Music ends at 10pm (town ordinance)"
  and "(venue policy)" are different facts with different negotiability, and
  telling them apart is exactly the competence being demonstrated.
- **Every page is a lead capture point**, with the venue attached to the inquiry.
- **Every page links** into its region guide, the relevant vertical, and `/start`.
- **Corrections are welcomed, not argued.** A visible "something wrong here?"
  route, and corrections applied promptly. See the sensitivity note below.

## Commercial sensitivity

Publishing curfews, mandatory-vendor status or parking shortfalls can antagonise
the very venues whose referrals a new coordinator depends on.

Mitigation: publish only publicly documented facts, cite the venue's own page,
present constraints neutrally as planning information rather than as criticism,
and correct on request without argument. If a venue objects to an accurate,
sourced fact, that is a relationship judgement for the founder — not a
unilateral engineering decision.

## Candidate venues

Thirty named Connecticut venues with observed public documentation are listed in
`docs/SEO_STRATEGY.md`. **Every capacity figure there is SERP-derived and must
be re-verified against the venue's own site before publication.**
