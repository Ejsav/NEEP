# New England Event Planners

Connecticut event planning and coordination — weddings, corporate events,
private events, and venue & vendor coordination.

**Status: reset to zero on 2026-09-13.** The strategy, constraints and plan are
intact. There is no application code yet. Slice 0 is the scaffold.

## Start here

- **`CLAUDE.md`** — the project constitution. Scope, the four hard constraints,
  stack, definition of done. Read it first, every session.
- **`docs/PHASE_PLAN.md`** — what to build next, and the acceptance criteria
  that decide when it is done.
- **`docs/DECISIONS.md`** — why anything is the way it is. Read before changing
  a dependency or an approach.

Run `/audit` in a fresh session for an adversarial review against the
constitution.

## What carried over

The whole `docs/` set — spec, architecture, data model, venue database, trust
strategy, SEO strategy, content model, security, analytics, decisions, phase
plan — plus `CLAUDE.md` and the `/audit` command. Those are the expensive part.

## What did not

Every line of application code, the Next.js scaffold, the dependency manifest,
migrations, tests and verification scripts. Rebuilding them is Slice 0.

The stack in `CLAUDE.md` is the target, not the current state: Next.js 16 App
Router · React 19 · TypeScript 5.9 strict · Tailwind CSS v4 · PostgreSQL via
Drizzle · Zod v4 · Vitest · Playwright. TypeScript is pinned to 5.9 and ESLint
to 9 for real toolchain reasons — see `docs/DECISIONS.md` D-010 before choosing
either version.

## Setup

Nothing to install yet. The first slice creates the scaffold, `package.json`
and the `pnpm verify` pipeline described in `CLAUDE.md`.
