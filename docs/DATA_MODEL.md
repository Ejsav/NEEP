# Data model

Schema lives in `src/lib/db/schema.ts`. Migrations in `drizzle/`. Generate with
`pnpm db:generate`, apply with `pnpm db:migrate`. Never hand-edit a migration
that has been applied anywhere.

## Tables as shipped in Slice 1

### `inquiries` — the lead

The revenue record. Everything else in the system exists to protect it.

| Column | Type | Note |
| --- | --- | --- |
| `id` | uuid pk | `gen_random_uuid()`, built into Postgres 13+ |
| `reference` | text unique | `NEEP-XXXXXX`, safe to read aloud on the phone |
| `status` | enum | new, in_progress, quoted, won, lost, spam |
| `event_type` | enum | wedding, corporate, private, coordination |
| `first_name` `last_name` `email` `phone` | text | phone nullable |
| `contact_preference` | enum | email, phone, either |
| `event_date` | date | nullable when the customer is flexible |
| `event_date_flexible` | boolean | one of date/flexible is required |
| `guest_count_min` `guest_count_max` | integer | nullable |
| `venue_status` | enum | booked, shortlisted, not_started, need_help |
| `venue_name` `event_town` | text | free text until the venue table exists |
| `budget_band` | text | the CUSTOMER's budget, never our pricing |
| `services_needed` | jsonb `string[]` | validated against the canonical list |
| `message` | text | capped at 4000 |
| `submitted_at` | timestamptz | |
| `response_due_at` | timestamptz | **not null** — the SLA is a column |
| `first_response_at` | timestamptz | null until a human explicitly responds |

Indexed on `submitted_at`, `status`, `response_due_at`, `email`, plus the unique
index on `reference`.

**Why `response_due_at` is a column and not a computed value.** The response
commitment has to be a fact the database can be queried on, not an expression
recomputed at render time. It also means changing `RESPONSE_SLA_HOURS` later
does not retroactively rewrite promises already made to customers.

**`budget_band` is text, not an enum**, because the bands are a marketing
taxonomy likely to change; enum churn would mean a migration each time.
`event_type` and `status` are enums because they are structural.

### `inquiry_attribution` — 1:1 with an inquiry

Separate table for two reasons: it is the column set most likely to grow, and it
keeps marketing data separable from the contact record.

Symmetric `first_*` and `last_*` column sets: `touch_at`, `landing_path`,
`referrer`, `referrer_host`, `utm_source/medium/campaign/term/content`,
`click_id`, `click_id_source`. Plus `session_id`, `touch_count`,
`submitted_from_path`, `user_agent`, `ip_hash`.

- **First touch is written once and never overwritten.** How they found us, ever.
- **Last touch is overwritten only by a visit carrying campaign intent** — a
  UTM, an ad click id, or an external referrer. A later direct visit does not
  erase the campaign that actually drove them. This is what makes paid spend
  measurable.
- `ip_hash` is a keyed HMAC. **The raw address is never stored.**
- FK `ON DELETE CASCADE`: deleting a lead removes its attribution.

**Written after the inquiry commits, not in the same transaction.** Deliberate —
see `docs/DECISIONS.md` D-008.

### `notifications` — outbox

`inquiry_id`, `channel`, `driver`, `recipient`, `subject`, `body_text`,
`status` (pending / sent / failed / no_provider), `attempts`, `last_error`,
`provider_message_id`, `created_at`, `sent_at`.

The row is written **before** any delivery attempt, so a provider outage can
never make a lead invisible. `no_provider` is a first-class state, surfaced in
admin in plain language — never rendered as if an email went out.

### `admin_users`

`email` (stored lowercased, uniquely indexed), `password_hash`, `name`, `role`
(owner / staff), `is_active`, `last_login_at`.

`is_active` is checked on **every** request, not just at login, so deactivation
takes effect immediately rather than at session expiry.

### `admin_sessions`

`token_hash` (SHA-256 of the cookie token — the raw token exists only in the
cookie), `user_id`, `absolute_expires_at`, `idle_expires_at`, `last_seen_at`,
`revoked_at`, `ip_hash`, `user_agent`.

Two expiry clocks by design: absolute is a hard ceiling, idle rolls forward.

### `audit_log`

`actor_user_id` (FK, `ON DELETE SET NULL`), `actor_label` (denormalised so the
record survives user deletion), `action`, `entity_type`, `entity_id`,
`metadata` jsonb, `ip_hash`, `created_at`.

### `rate_limit_buckets`

Composite pk `(bucket_key, window_start)`, `count`. Fixed-window counters,
incremented via `ON CONFLICT DO UPDATE`, which is atomic under concurrency — a
test asserts 20 parallel requests produce a count of exactly 20.

## Conventions

- **uuid primary keys.** Non-enumerable in URLs, and they let a record be
  referenced before it is written.
- **timestamptz everywhere.** Never naive timestamps. Display converts to
  `America/New_York` at render.
- **`date` for `event_date`.** An event date is a calendar date, not an instant;
  storing it as a timestamp invites timezone bugs on exactly the field customers
  care most about.
- **Explicit column lists in read models.** Never `select()` a whole row into a
  payload — that is what stops a future cost or margin column leaking by default.
- **No soft deletes yet.** Add `deleted_at` if and when the requirement is real.

## Planned: venues (Slice 4)

Not yet built. The schema constraint that matters most: **every field carries
its own provenance** — `source_url`, `verified_at`, `confidence`. An unverified
field renders as "not confirmed", never blank and never guessed. An incomplete
honest record beats a complete fabricated one. See `docs/VENUE_DATABASE.md`.
