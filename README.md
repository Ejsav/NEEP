# New England Event Planners

Connecticut event planning and coordination — weddings, corporate events,
private events, and venue & vendor coordination.

## Start here

- **`CLAUDE.md`** — the project constitution. Scope, hard constraints, stack,
  commands, definition of done. Read it first.
- **`docs/PHASE_PLAN.md`** — what to build next.
- **`docs/DECISIONS.md`** — why anything is the way it is.

## Setup

```bash
pnpm install
cp .env.example .env.local     # fill in DATABASE_URL and APP_SECRET
pnpm db:migrate
pnpm admin:create              # env-driven: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
pnpm dev
```

Generate `APP_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Verifying

```bash
pnpm verify      # typecheck + lint + test + build
pnpm verify:e2e  # browser checks against a built app on :3000
```

`pnpm verify:e2e` needs `VERIFY_ADMIN_EMAIL` and `VERIFY_ADMIN_PASSWORD` for an
account created with `pnpm admin:create`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 strict · Tailwind CSS v4 ·
PostgreSQL via Drizzle · Zod v4 · Vitest · Playwright.

TypeScript is pinned to 5.9 and ESLint to 9 for real toolchain reasons — see
`docs/DECISIONS.md` D-010 before upgrading either.
