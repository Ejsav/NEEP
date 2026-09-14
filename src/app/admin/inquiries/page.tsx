import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import {
  countInquiries,
  countOverdue,
  isOverdue,
  listInquiries,
  slaSummary,
  type InquiryFilter,
  type InquiryListRow,
} from "@/lib/inquiries/queries";
import { BUDGET_BANDS, EVENT_TYPES, labelFor } from "@/lib/domain/inquiry-options";
import { resendConfig, notificationRecipient, responseSlaHours } from "@/lib/env";
import { AdminBar } from "@/components/admin/admin-bar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries" };

const PAGE_SIZE = 50;

const STATUS_VALUES = [
  "new",
  "in_progress",
  "quoted",
  "won",
  "lost",
  "spam",
] as const;

/** Quiet by default. Only "won" and the two dead ends earn a colour. */
const STATUS_TONE: Record<(typeof STATUS_VALUES)[number], string> = {
  new: "bg-accent-soft text-accent",
  in_progress: "bg-paper-sunk text-ink",
  quoted: "bg-paper-sunk text-ink",
  won: "bg-positive-soft text-positive",
  lost: "bg-paper-sunk text-ink-subtle",
  spam: "bg-paper-sunk text-ink-subtle",
};

const STATUS_LABELS: Record<(typeof STATUS_VALUES)[number], string> = {
  new: "New",
  in_progress: "In progress",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

/**
 * A query parameter is user input even inside an authenticated area. An
 * unrecognised value is dropped rather than passed to the query builder, so a
 * hand-edited URL can only ever produce a narrower result set, never an error
 * and never a different table.
 */
function readFilter(params: Record<string, string | undefined>): InquiryFilter {
  const status = (STATUS_VALUES as readonly string[]).includes(params.status ?? "")
    ? (params.status as (typeof STATUS_VALUES)[number])
    : undefined;

  const eventType = EVENT_TYPES.some((o) => o.value === params.eventType)
    ? (params.eventType as InquiryFilter["eventType"])
    : undefined;

  const search = params.q?.trim().slice(0, 120) || undefined;

  return { status, eventType, overdue: params.overdue === "1", search };
}

/** Rebuilds the current query string with one value changed. */
function hrefWith(
  params: Record<string, string | undefined>,
  changes: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value !== undefined && value !== "") next.set(key, value);
  }
  const query = next.toString();
  return query ? `/admin/inquiries?${query}` : "/admin/inquiries";
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const filter = readFilter(params);
  const filtered =
    Boolean(filter.status || filter.eventType || filter.overdue || filter.search);
  const now = new Date();

  const [rows, matching, allTime, overdue, sla] = await Promise.all([
    listInquiries({ limit: PAGE_SIZE, offset, filter, now }),
    countInquiries(filter, now),
    countInquiries(),
    countOverdue(now),
    slaSummary(30, now),
  ]);

  const total = matching;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emailConfigured = Boolean(resendConfig()) && Boolean(notificationRecipient());

  return (
    <>
      <AdminBar user={admin.user} />

      <div className="mx-auto flex max-w-wide flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-heading-1 text-ink">Inquiries</h1>
            <p className="text-small text-ink-muted">
              {filtered ? (
                <>
                  {total} matching of {allTime} total
                </>
              ) : (
                <>{allTime} total</>
              )}{" "}
              &middot; responding within {responseSlaHours()} hours
            </p>
          </div>

          {/*
            The only number that says whether the promise on the public site is
            being kept. Last 30 days, spam excluded. "Missed" counts an inquiry
            answered after its deadline OR still unanswered with the deadline
            past - an inquiry inside its window is neither kept nor missed yet.
          */}
          {sla.received > 0 ? (
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
              <Metric label="Received, 30 days" value={sla.received} />
              <Metric label="Answered in time" value={sla.answered} tone="positive" />
              <Metric
                label="Missed"
                value={sla.missed}
                tone={sla.missed > 0 ? "critical" : "muted"}
              />
            </dl>
          ) : null}
        </header>

        {/*
          A plain GET form. Filtering a table is exactly what one is for: it
          works without JavaScript, the result is a URL an operator can bookmark
          or send to someone, and the back button does what they expect.
        */}
        <form
          method="get"
          action="/admin/inquiries"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper-raised p-4"
        >
          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium text-ink-muted">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={filter.search ?? ""}
              placeholder="Reference, name, email, town"
              className="min-h-10 w-64 max-w-full rounded-md border border-line-strong bg-paper px-3 text-small text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium text-ink-muted">Status</span>
            <select
              name="status"
              defaultValue={filter.status ?? ""}
              className="min-h-10 rounded-md border border-line-strong bg-paper px-3 text-small text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <option value="">Any</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium text-ink-muted">Event</span>
            <select
              name="eventType"
              defaultValue={filter.eventType ?? ""}
              className="min-h-10 rounded-md border border-line-strong bg-paper px-3 text-small text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <option value="">Any</option>
              {EVENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-10 items-center gap-2 text-small text-ink">
            <input
              type="checkbox"
              name="overdue"
              value="1"
              defaultChecked={filter.overdue}
              className="h-4 w-4 accent-accent"
            />
            Overdue only
          </label>

          <button
            type="submit"
            className="min-h-10 rounded-md bg-accent px-4 text-small font-medium text-accent-ink transition duration-150 ease-out-quiet hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Apply
          </button>

          {filtered ? (
            <Link
              href="/admin/inquiries"
              className="inline-flex min-h-10 items-center text-small text-ink-muted underline underline-offset-4 hover:text-accent"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {/*
          Configuration honesty. If notifications are not actually being
          delivered, the dashboard says so. A dashboard that looks healthy while
          email is silently unconfigured is how leads go cold.
        */}
        {!emailConfigured ? (
          <p
            role="status"
            className="rounded-lg border border-caution bg-caution-soft px-4 py-3 text-small text-ink"
          >
            <strong className="font-semibold">Email notifications are not configured.</strong>{" "}
            Inquiries are being saved correctly, but no email is being sent for
            them. Set <code className="font-mono text-micro">RESEND_API_KEY</code>,{" "}
            <code className="font-mono text-micro">EMAIL_FROM</code> and{" "}
            <code className="font-mono text-micro">INQUIRY_NOTIFICATION_EMAIL</code>{" "}
            to turn delivery on.
          </p>
        ) : null}

        {overdue > 0 ? (
          <p
            role="status"
            className="rounded-lg border border-critical bg-critical-soft px-4 py-3 text-small text-ink"
          >
            <strong className="font-semibold">
              {overdue} {overdue === 1 ? "inquiry is" : "inquiries are"} past the
              response deadline.
            </strong>{" "}
            The response commitment is published on the site. It is a promise the
            business made, so it needs answering today.{" "}
            <Link
              href={hrefWith({}, { overdue: "1" })}
              className="font-medium text-ink underline underline-offset-4"
            >
              Show them
            </Link>
            .
          </p>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState filtered={filtered} />
        ) : (
          <>
            {/* Table on wide screens. */}
            <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper-raised lg:block">
              <table className="w-full border-collapse text-small">
                <caption className="sr-only">
                  Inquiries, newest first. Overdue rows are marked in the status
                  column.
                </caption>
                <thead>
                  <tr className="border-b border-line text-left">
                    <Th>Received</Th>
                    <Th>Reference</Th>
                    <Th>Name</Th>
                    <Th>Event</Th>
                    <Th>Date</Th>
                    <Th>Guests</Th>
                    <Th>Budget</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-line last:border-0 hover:bg-paper-sunk"
                    >
                      <Td>
                        <time dateTime={row.submittedAt.toISOString()}>
                          {formatDateTime(row.submittedAt)}
                        </time>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/inquiries/${row.id}`}
                          className="whitespace-nowrap font-mono text-micro text-accent underline underline-offset-4"
                        >
                          {row.reference}
                        </Link>
                      </Td>
                      <Td>
                        <span className="font-medium text-ink">
                          {row.firstName} {row.lastName}
                        </span>
                        <br />
                        <span className="text-micro text-ink-subtle">{row.email}</span>
                      </Td>
                      <Td>{labelFor(EVENT_TYPES, row.eventType)}</Td>
                      <Td>{formatEventDate(row)}</Td>
                      <Td>{formatGuests(row)}</Td>
                      <Td>{labelFor(BUDGET_BANDS, row.budgetBand) ?? "—"}</Td>
                      <Td>{formatSource(row)}</Td>
                      <Td>
                        <StatusCell row={row} now={now} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on narrow screens. A table at 375px is unusable. */}
            <ul className="flex flex-col gap-3 lg:hidden">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-line bg-paper-raised p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/inquiries/${row.id}`}
                      className="whitespace-nowrap font-mono text-micro text-accent underline underline-offset-4"
                    >
                      {row.reference}
                    </Link>
                    <StatusCell row={row} now={now} />
                  </div>
                  <p className="mt-2 font-medium text-ink">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="text-micro text-ink-subtle">{row.email}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-micro">
                    <Cell label="Event">{labelFor(EVENT_TYPES, row.eventType)}</Cell>
                    <Cell label="Date">{formatEventDate(row)}</Cell>
                    <Cell label="Guests">{formatGuests(row)}</Cell>
                    <Cell label="Source">{formatSource(row)}</Cell>
                  </dl>
                  <p className="mt-3 text-micro text-ink-subtle">
                    Received{" "}
                    <time dateTime={row.submittedAt.toISOString()}>
                      {formatDateTime(row.submittedAt)}
                    </time>
                  </p>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between gap-4 text-small"
              >
                {page > 1 ? (
                  <Link
                    href={hrefWith(params, { page: String(page - 1) })}
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="text-ink-subtle">Previous</span>
                )}
                <span className="text-ink-muted">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={hrefWith(params, { page: String(page + 1) })}
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="text-ink-subtle">Next</span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

/**
 * Honest empty state. Zero leads is the correct state on day one, not an error -
 * but zero MATCHES is a different message, and showing "no inquiries yet" to
 * someone who just filtered would be a small lie with an operational cost.
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-paper-raised p-10 text-center">
        <h2 className="font-display text-heading-2 text-ink">
          Nothing matches that.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">
          There are inquiries in the system — none of them fit these filters.{" "}
          <Link
            href="/admin/inquiries"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            Clear the filters
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-paper-raised p-10 text-center">
      <h2 className="font-display text-heading-2 text-ink">No inquiries yet.</h2>
      <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">
        This is what zero looks like. When someone completes the planner at{" "}
        <code className="font-mono text-micro">/plan</code>, they appear here
        immediately, with a response deadline attached.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "muted" | "positive" | "critical";
}) {
  const colour =
    tone === "positive"
      ? "text-positive"
      : tone === "critical"
        ? "text-critical"
        : "text-ink";
  return (
    <div className="flex flex-col gap-0.5 bg-paper-raised px-4 py-3">
      <dt className="text-micro text-ink-subtle">{label}</dt>
      <dd className={`font-display text-heading-2 ${colour}`} data-numeric>
        {value}
      </dd>
    </div>
  );
}

/**
 * Two different facts, and the list needs both.
 *
 * The lifecycle status is where the lead is in the pipeline; the SLA state is
 * whether the published response commitment is being kept. The first version
 * of this cell showed only the second, which meant "won" and "spam" were
 * invisible in the queue and a spam row still displayed a response deadline it
 * was never going to have.
 */
function StatusCell({ row, now }: { row: InquiryListRow; now: Date }) {
  const settled = row.status === "won" || row.status === "lost" || row.status === "spam";

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-micro font-medium ${
          STATUS_TONE[row.status]
        }`}
      >
        {STATUS_LABELS[row.status]}
      </span>

      {settled ? null : isOverdue(row, now) ? (
        <span className="text-micro font-semibold text-critical">Overdue</span>
      ) : row.firstResponseAt ? (
        <span className="text-micro text-positive">
          Answered in {formatElapsed(row.submittedAt, row.firstResponseAt)}
        </span>
      ) : (
        <span className="text-micro text-ink-subtle">
          Due {formatDateTime(row.responseDueAt)}
        </span>
      )}
    </div>
  );
}

/** Elapsed time between two instants, to the nearest sensible unit. */
function formatElapsed(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-micro font-semibold text-ink-muted">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-ink-muted">{children}</td>;
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(value);
}

function formatEventDate(row: InquiryListRow): string {
  if (row.eventDate) {
    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${row.eventDate}T12:00:00Z`));
    return row.eventDateFlexible ? `${formatted} (flex)` : formatted;
  }
  return row.eventDateFlexible ? "Flexible" : "—";
}

function formatGuests(row: InquiryListRow): string {
  if (row.guestCountMin && row.guestCountMax) {
    return `${row.guestCountMin}–${row.guestCountMax}`;
  }
  return String(row.guestCountMin ?? row.guestCountMax ?? "—");
}

function formatSource(row: InquiryListRow): string {
  if (row.lastUtmSource) {
    return [row.lastUtmSource, row.lastUtmMedium].filter(Boolean).join(" / ");
  }
  if (row.lastReferrerHost) return row.lastReferrerHost;
  return "Direct";
}
