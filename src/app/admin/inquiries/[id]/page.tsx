import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getAttribution,
  getInquiry,
  getNotifications,
  isOverdue,
} from "@/lib/inquiries/queries";
import {
  BUDGET_BANDS,
  CONTACT_PREFERENCES,
  EVENT_TYPES,
  VENUE_STATUSES,
  labelFor,
  serviceLabels,
} from "@/lib/domain/inquiry-options";
import { AdminBar } from "@/components/admin/admin-bar";
import { Button } from "@/components/ui/button";
import { markRespondedAction, updateStatusAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Inquiry" };
  const inquiry = await getInquiry(id);
  return { title: inquiry ? inquiry.reference : "Inquiry" };
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  // Reject a malformed id before it reaches Postgres, which would otherwise
  // raise a type error rather than a clean 404.
  if (!UUID.test(id)) notFound();

  const inquiry = await getInquiry(id);
  if (!inquiry) notFound();

  const [attribution, notifications] = await Promise.all([
    getAttribution(inquiry.id),
    getNotifications(inquiry.id),
  ]);

  const overdue = isOverdue(inquiry);
  const services = serviceLabels(inquiry.servicesNeeded);

  return (
    <>
      <AdminBar user={admin.user} />

      <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-8 sm:px-8">
        <Link
          href="/admin/inquiries"
          className="text-micro text-ink-muted underline underline-offset-4 hover:text-accent"
        >
          &larr; All inquiries
        </Link>

        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-heading-1 text-ink">
              {inquiry.firstName} {inquiry.lastName}
            </h1>
            <span className="font-mono text-small text-ink-subtle">
              {inquiry.reference}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-small">
            {overdue ? (
              <span className="rounded-full bg-critical-soft px-3 py-1 text-micro font-semibold text-critical">
                Past response deadline
              </span>
            ) : inquiry.firstResponseAt ? (
              <span className="rounded-full bg-positive-soft px-3 py-1 text-micro font-medium text-positive">
                Responded {formatDateTime(inquiry.firstResponseAt)}
              </span>
            ) : (
              <span className="rounded-full bg-paper-sunk px-3 py-1 text-micro font-medium text-ink-muted">
                Respond by {formatDateTime(inquiry.responseDueAt)}
              </span>
            )}
            <span className="text-ink-subtle">
              Received {formatDateTime(inquiry.submittedAt)}
            </span>
          </div>
        </header>

        {/* ------------------------------------------------------- Actions */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-paper-raised p-4">
          {!inquiry.firstResponseAt ? (
            <form action={markRespondedAction}>
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <Button type="submit" variant="primary">
                Mark as responded
              </Button>
            </form>
          ) : null}

          <form action={updateStatusAction} className="flex items-end gap-2">
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-micro font-medium text-ink">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={inquiry.status}
                className="min-h-11 rounded-md border border-line-strong bg-paper-raised px-3 text-small text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-focus"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Update
            </Button>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---------------------------------------------------- Contact */}
          <Panel title="Contact">
            <Row label="Email">
              <a
                href={`mailto:${inquiry.email}`}
                className="text-accent underline underline-offset-4"
              >
                {inquiry.email}
              </a>
            </Row>
            <Row label="Phone">
              {inquiry.phone ? (
                <a
                  href={`tel:${inquiry.phone}`}
                  className="text-accent underline underline-offset-4"
                >
                  {inquiry.phone}
                </a>
              ) : (
                "Not provided"
              )}
            </Row>
            <Row label="Prefers">
              {labelFor(CONTACT_PREFERENCES, inquiry.contactPreference)}
            </Row>
          </Panel>

          {/* ------------------------------------------------------ Event */}
          <Panel title="Event">
            <Row label="Type">{labelFor(EVENT_TYPES, inquiry.eventType)}</Row>
            <Row label="Date">
              {inquiry.eventDate ?? "Not set"}
              {inquiry.eventDateFlexible ? " (flexible)" : ""}
            </Row>
            <Row label="Guests">
              {inquiry.guestCountMin || inquiry.guestCountMax
                ? `${inquiry.guestCountMin ?? "?"} – ${inquiry.guestCountMax ?? "?"}`
                : "Not provided"}
            </Row>
            <Row label="Town">{inquiry.eventTown ?? "Not provided"}</Row>
            <Row label="Venue">{inquiry.venueName ?? "Not provided"}</Row>
            <Row label="Venue status">
              {labelFor(VENUE_STATUSES, inquiry.venueStatus) ?? "Not provided"}
            </Row>
            <Row label="Budget">
              {labelFor(BUDGET_BANDS, inquiry.budgetBand) ?? "Not provided"}
            </Row>
          </Panel>

          {/* --------------------------------------------------- Services */}
          <Panel title="Services requested">
            {services.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <li
                    key={service}
                    className="rounded-full bg-paper-sunk px-3 py-1 text-micro text-ink"
                  >
                    {service}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-subtle">None selected.</p>
            )}
          </Panel>

          {/* ------------------------------------------------ Notifications */}
          <Panel title="Notifications">
            {notifications.length === 0 ? (
              <p className="text-small text-ink-subtle">
                No notification was recorded for this inquiry.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {notifications.map((notification) => (
                  <li key={notification.id} className="text-small">
                    <div className="flex flex-wrap items-center gap-2">
                      <NotificationStatus status={notification.status} />
                      <span className="text-ink-muted">
                        via {notification.driver} to {notification.recipient}
                      </span>
                    </div>
                    {notification.lastError ? (
                      <p className="mt-1 text-micro text-critical">
                        {notification.lastError}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------------------------------------------------- Message */}
        {inquiry.message ? (
          <Panel title="Message">
            <p className="whitespace-pre-wrap text-body text-ink">
              {inquiry.message}
            </p>
          </Panel>
        ) : null}

        {/* ------------------------------------------------- Attribution */}
        <Panel title="Attribution">
          {!attribution ? (
            <p className="text-small text-caution">
              No attribution was captured for this inquiry. The lead is intact;
              the marketing data was not recorded.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="eyebrow text-ink-subtle">First touch</h3>
                <Row label="When">{formatOptionalDate(attribution.firstTouchAt)}</Row>
                <Row label="Landed on">{attribution.firstLandingPath ?? "—"}</Row>
                <Row label="Referrer">{attribution.firstReferrerHost ?? "Direct"}</Row>
                <Row label="Source">{attribution.firstUtmSource ?? "—"}</Row>
                <Row label="Medium">{attribution.firstUtmMedium ?? "—"}</Row>
                <Row label="Campaign">{attribution.firstUtmCampaign ?? "—"}</Row>
                <Row label="Click ID">
                  {attribution.firstClickId
                    ? `${attribution.firstClickIdSource ?? "unknown"}: ${attribution.firstClickId}`
                    : "—"}
                </Row>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="eyebrow text-ink-subtle">Last touch</h3>
                <Row label="When">{formatOptionalDate(attribution.lastTouchAt)}</Row>
                <Row label="Landed on">{attribution.lastLandingPath ?? "—"}</Row>
                <Row label="Referrer">{attribution.lastReferrerHost ?? "Direct"}</Row>
                <Row label="Source">{attribution.lastUtmSource ?? "—"}</Row>
                <Row label="Medium">{attribution.lastUtmMedium ?? "—"}</Row>
                <Row label="Campaign">{attribution.lastUtmCampaign ?? "—"}</Row>
                <Row label="Click ID">
                  {attribution.lastClickId
                    ? `${attribution.lastClickIdSource ?? "unknown"}: ${attribution.lastClickId}`
                    : "—"}
                </Row>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <h3 className="eyebrow text-ink-subtle">Session</h3>
                <Row label="Visits before submitting">
                  {String(attribution.touchCount)}
                </Row>
                <Row label="Submitted from">
                  {attribution.submittedFromPath ?? "—"}
                </Row>
                <Row label="User agent">
                  <span className="break-all text-micro">
                    {attribution.userAgent ?? "—"}
                  </span>
                </Row>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-5">
      <h2 className="font-display text-heading-2 text-ink">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 text-small">
      <span className="text-ink-subtle">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

function NotificationStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-positive-soft text-positive",
    failed: "bg-critical-soft text-critical",
    no_provider: "bg-caution-soft text-caution",
    pending: "bg-paper-sunk text-ink-muted",
  };
  const labels: Record<string, string> = {
    sent: "Sent",
    failed: "Failed",
    // Named plainly. A dashboard must not imply an email went out when it did not.
    no_provider: "Not sent — no email provider configured",
    pending: "Pending",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-micro font-medium ${styles[status] ?? styles.pending}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(value);
}

function formatOptionalDate(value: Date | null): string {
  return value ? formatDateTime(value) : "—";
}
