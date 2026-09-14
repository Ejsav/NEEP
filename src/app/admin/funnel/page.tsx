import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminBar } from "@/components/admin/admin-bar";
import { funnelSummary, type StepRow } from "@/lib/inquiries/funnel";
import { ABANDON_AFTER_MINUTES } from "@/lib/inquiries/drafts";
import { EVENT_TYPES, labelFor } from "@/lib/domain/inquiry-options";

export const dynamic = "force-dynamic";
export const metadata = { title: "Funnel" };

/**
 * Where people stop.
 *
 * PLAN.md names the riskiest assumption in the build: that a five-step planner
 * raises qualified submissions rather than suppressing them versus the
 * single-page form it replaced. The data to answer that has been accumulating
 * since the planner shipped and nothing has ever read it. This page reads it.
 *
 * It deliberately shows no individual drafts. A draft carries no name, email or
 * phone by design - it is a record of a funnel, not of a person - so there is
 * nothing about one worth opening, and building a browser for them would invite
 * exactly the contact-capture this system declines to do.
 */
export default async function FunnelPage() {
  const admin = await requireAdmin();
  const summary = await funnelSummary();

  const worst = summary.steps
    .filter((s) => s.reached > 0 && s.continuationRate !== null)
    .sort((a, b) => (a.continuationRate ?? 1) - (b.continuationRate ?? 1))[0];

  return (
    <>
      <AdminBar user={admin.user} />

      <div className="mx-auto flex max-w-wide flex-col gap-6 px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-heading-1 text-ink">Funnel</h1>
          <p className="text-small text-ink-muted">
            Every visitor who answered at least the first question.{" "}
            <Link
              href="/admin/inquiries"
              className="underline underline-offset-4 hover:text-accent"
            >
              Back to inquiries
            </Link>
          </p>
        </header>

        {summary.started === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-paper-raised p-10 text-center">
            <h2 className="font-display text-heading-2 text-ink">
              Nobody has started the planner yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">
              A row appears here the moment someone answers the first question,
              whether or not they finish. Until then there is nothing to measure,
              and a chart of nothing would be worse than this sentence.
            </p>
          </div>
        ) : (
          <>
            <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
              <Metric label="Started" value={summary.started} />
              <Metric label="Completed" value={summary.converted} tone="positive" />
              <Metric label="Gave up" value={summary.abandoned} tone="critical" />
              <Metric label="Still filling in" value={summary.live} />
            </dl>

            <p className="text-small text-ink-muted">
              {summary.conversionRate !== null ? (
                <>
                  <strong className="font-semibold text-ink">
                    {percent(summary.conversionRate)}
                  </strong>{" "}
                  of people who start the planner finish it.
                </>
              ) : null}{" "}
              A visitor counts as having given up once{" "}
              {ABANDON_AFTER_MINUTES} minutes pass without them touching the
              form; before that they are still filling it in.
            </p>

            {/*
              The whole point of the page. "Reached" is cumulative, so each row
              answers a question an operator can act on: of everyone who got
              this far, how many carried on?
            */}
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-heading-2 text-ink">
                Where people stop
              </h2>
              <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
                <table className="w-full border-collapse text-small">
                  <caption className="sr-only">
                    Planner steps, with how many visitors reached each and how
                    many carried on to the next.
                  </caption>
                  <thead>
                    <tr className="border-b border-line text-left">
                      <Th>Step</Th>
                      <Th>Question</Th>
                      <Th>Reached</Th>
                      <Th>Carried on</Th>
                      <Th>Stopped here</Th>
                      <Th>Continuation</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.steps.map((row) => (
                      <StepRowView key={row.step} row={row} worstStep={worst?.step} />
                    ))}
                  </tbody>
                </table>
              </div>
              {worst && worst.continuationRate !== null && worst.reached >= 5 ? (
                <p className="text-small text-ink-muted">
                  Step {worst.step} loses the most people. If that holds as the
                  sample grows, it is the step to change — the number of steps is
                  a configuration in{" "}
                  <code className="font-mono text-micro">
                    lib/domain/planner-steps.ts
                  </code>
                  , so testing four against five is an edit rather than a rebuild.
                </p>
              ) : (
                <p className="text-small text-ink-subtle">
                  Too little data to name a worst step yet. These numbers start
                  meaning something at a few dozen visitors.
                </p>
              )}
            </section>

            {summary.abandoned > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-heading-2 text-ink">
                  What the people who gave up were planning
                </h2>
                <p className="max-w-measure text-small text-ink-muted">
                  {summary.abandonedWithDetail} of {summary.abandoned} abandoned
                  visitors answered something beyond the first question. No
                  competitor in this market captures any of this, and it carries
                  no name, email or phone — there is nobody here to contact, only
                  demand to read.
                </p>
                <dl className="flex flex-col rounded-xl border border-line bg-paper-raised">
                  {summary.abandonedByEventType.map((row) => (
                    <div
                      key={row.eventType ?? "unanswered"}
                      className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0"
                    >
                      <dt className="text-small text-ink">
                        {row.eventType
                          ? (labelFor(EVENT_TYPES, row.eventType) ?? row.eventType)
                          : "Did not answer"}
                      </dt>
                      <dd className="text-small font-medium text-ink" data-numeric>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function StepRowView({ row, worstStep }: { row: StepRow; worstStep?: number }) {
  const isWorst = row.step === worstStep && row.reached >= 5;
  return (
    <tr className="border-b border-line last:border-0">
      <Td>
        <span className="font-mono text-micro text-ink-subtle">
          {String(row.step).padStart(2, "0")}
        </span>
      </Td>
      <Td>
        <span className="text-ink">{row.legend}</span>
      </Td>
      <Td>
        <span data-numeric>{row.reached}</span>
      </Td>
      <Td>
        <span data-numeric>{row.continued}</span>
      </Td>
      <Td>
        <span data-numeric className={row.abandonedHere > 0 ? "text-critical" : ""}>
          {row.abandonedHere}
        </span>
      </Td>
      <Td>
        {row.continuationRate === null ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <div className="flex items-center gap-3">
            {/* A bar, not a chart library. One div says everything a sparkline would. */}
            <span
              aria-hidden="true"
              className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-sunk"
            >
              <span
                className={`block h-full rounded-full ${
                  isWorst ? "bg-critical" : "bg-sage"
                }`}
                style={{ width: `${Math.round(row.continuationRate * 100)}%` }}
              />
            </span>
            <span data-numeric className="text-ink">
              {percent(row.continuationRate)}
            </span>
          </div>
        )}
      </Td>
    </tr>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-micro font-semibold text-ink-muted">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle text-ink-muted">{children}</td>;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
