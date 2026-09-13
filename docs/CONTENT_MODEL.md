# Content model

## Voice

Direct, specific, and unembarrassed about being new.

The company has no track record, and every visitor can tell. Copy that performs
confidence it has not earned reads as exactly what it is. Copy that says "we're
new, here is precisely how we work, hold us to it" converts better and is true.

**Write like this.** "A real reply within 24 hours." "If we're not a fit, we say
so and point you somewhere better." "This is what zero looks like."

**Not like this.** "Trusted by couples across New England." "Award-winning."
"Your dream day awaits." "Let us take care of everything."

**Specificity is the tone.** "Mystic, Litchfield, Greenwich" beats "throughout
the region". "Events wrap by midnight (town ordinance)" beats "flexible timing".

## Hard content rules

These are not style preferences.

1. **No claim without a receipt.** No reviews, testimonials, customers, logos,
   events, awards, press, partnerships or statistics that do not exist.
   `docs/TRUST_STRATEGY.md`.
2. **Transportation verbs.** Allowed: coordinate, arrange, manage, source,
   schedule. Forbidden with "we" as subject: provide, offer, operate, run,
   drive, supply. Never "our fleet", "our vehicles", "our drivers". The full
   list is in `CLAUDE.md`; the reasoning is `docs/DECISIONS.md` D-013.
3. **Connecticut only.** Never imply operations elsewhere.
4. **Never mention the sibling DBAs.**
5. **No pricing figure** until the founder supplies real numbers (D-018).
6. **No doorway pages.** Never substitute a town name into a template.

## Page types

**Homepage.** Positioning, the four verticals, how it works, honest
positioning on what the company does and does not do, one CTA repeated. No
proof band, no logo wall, no counters.

**Vertical service page** (Slice 3). What is included, how it works, what it
costs the customer in time, and a preselected CTA into `/start`. Hand-written
per vertical — four pages, four separate pieces of writing.

**Venue record** (Slice 4). Verified facts with visible provenance, prose that a
template could not produce, and an inquiry CTA that attaches the venue. Unknown
fields say "not confirmed" rather than rendering blank.

**Regional venue guide** (Slice 4). The corridor research says is actually
winnable. Must be better than the photographer roundups that currently rank —
the logistics depth is the differentiator, not the photography.

**Process page** (Slice 2). What happens after submit, step by step, with the
same SLA number the system enforces.

## Structural conventions

- **Exactly one `h1`** per page. Heading levels never skip. The page-contract
  check enforces both.
- **Front-load the answer.** A visitor deciding whether to trust a new company
  will not read to paragraph four.
- **Tables for facts, prose for judgement.** Venue capacities belong in a table;
  what a 25-space car park means for a 150-guest wedding belongs in a sentence.
- **Distinguish policy from law** wherever both appear.
- **Every page links onward.** No page is a dead end; no strategic page is an
  orphan.

## Reusable content structures

Canonical option sets live in `src/lib/domain/inquiry-options.ts` and are shared
by the UI and by server validation, so a label can never drift from the value
the database will accept. Add new options there, never inline in a component.

`siteConfig` (`src/lib/site-config.ts`) holds public company facts, typed so
that unknown values are `null` and every consumer must handle absence. A contact
route that is not configured is omitted, never faked.

## Microcopy patterns

**Empty states name the reality.** "This is what zero looks like. When someone
submits the form at /start, they appear here immediately, with a response
deadline attached."

**Errors take the blame and give a route out.** "Something went wrong on our end
and your inquiry was not saved. This is our fault, not yours." Then the direct
contact route and an incident id.

**Configuration states say what is actually true.** "Not sent — no email
provider configured", never a green tick.

**Form hints explain why, not just what.** "Faster for anything time-sensitive"
beats "optional".
