import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import {
  countInquiries,
  countOverdue,
  isOverdue,
  listInquiries,
  type InquiryListRow,
} from "@/lib/inquiries/queries";
import { BUDGET_BANDS, EVENT_TYPES, labelFor } from "@/lib/domain/inquiry-options";
import { resendConfig, notificationRecipient, responseSlaHours } from "@/lib/env";
import { AdminBar } from "@/components/admin/admin-bar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries" };

const PAGE_SIZE = 50;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdmin();
  const { page: pageParam } = await searchParams;

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, total, overdue] = await Promise.all([
    listInquiries({ limit: PAGE_SIZE, offset }),
    countInquiries(),
    countOverdue(),
  ]);

  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emailConfigured = Boolean(resendConfig()) && Boolean(notificationRecipient());

  return (
    <>
      <AdminBar user={admin.user} />

      <div className="mx-auto flex max-w-wide flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-heading-1 text-ink">Inquiries</h1>
          <p className="text-small text-ink-muted">
            {total} total &middot; responding within {responseSlaHours()} hours
          </p>
        </header>

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
            business made, so it needs answering today.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState />
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
                          className="font-mono text-micro text-accent underline underline-offset-4"
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
                      className="font-mono text-micro text-accent underline underline-offset-4"
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
                    href={`/admin/inquiries?page=${page - 1}`}
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
                    href={`/admin/inquiries?page=${page + 1}`}
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

/** Honest empty state. Zero leads is the correct state on day one, not an error. */
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-paper-raised p-10 text-center">
      <h2 className="font-display text-heading-2 text-ink">No inquiries yet.</h2>
      <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">
        This is what zero looks like. When someone submits the form at{" "}
        <code className="font-mono text-micro">/start</code>, they appear here
        immediately, with a response deadline attached.
      </p>
    </div>
  );
}

function StatusCell({ row, now }: { row: InquiryListRow; now: Date }) {
  if (isOverdue(row, now)) {
    return (
      <span className="inline-flex items-center rounded-full bg-critical-soft px-2.5 py-1 text-micro font-semibold text-critical">
        Overdue
      </span>
    );
  }
  if (row.firstResponseAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-positive-soft px-2.5 py-1 text-micro font-medium text-positive">
        Responded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-paper-sunk px-2.5 py-1 text-micro font-medium text-ink-muted">
      Due {formatDateTime(row.responseDueAt)}
    </span>
  );
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
