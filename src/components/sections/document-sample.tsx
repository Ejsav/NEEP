import { Reveal } from "@/components/ui/reveal";

/**
 * A working document, shown rather than described.
 *
 * Every event-planning site in this category is a gallery of flowers. The
 * differentiator is the machinery underneath - the run-of-show, the vendor
 * schedule, the load-in window - because that is what a client is actually
 * buying and it is the one thing a competitor cannot fake with a stock photo.
 *
 * THE LINE THIS MUST NOT CROSS. These are TEMPLATES - the documents every event
 * gets - and they are labelled as such on the face of the component, not in a
 * footnote. Presenting one as a record of a completed event would be exactly
 * the fabrication CLAUDE.md forbids, and the caption is what keeps the
 * distinction visible rather than merely intended. The `caption` prop is
 * required for that reason.
 *
 * Rendered as a table with real structure rather than a picture of one, so it
 * is readable by a screen reader, selectable, translatable, and weighs nothing.
 */

export type DocumentColumn = {
  key: string;
  label: string;
  /** Tabular figures and a narrower column, for times and durations. */
  numeric?: boolean;
};

export function DocumentSample({
  title,
  caption,
  columns,
  rows,
  footnote,
}: {
  title: string;
  /** What this document IS. Required: it is what stops it reading as a receipt. */
  caption: string;
  columns: DocumentColumn[];
  rows: Record<string, string>[];
  footnote?: string;
}) {
  return (
    <Reveal className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-heading-2 text-ink">{title}</h3>
        <p className="text-small text-ink-muted">{caption}</p>
      </div>

      {/*
        Scrolls independently below the container width. A run-of-show has four
        columns of genuinely useful content and squeezing them onto a phone
        would lose the thing worth showing; the page itself never scrolls
        sideways.
      */}
      <div className="overflow-x-auto rounded-xl border border-line bg-paper-raised">
        <table className="w-full border-collapse text-small">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-micro font-semibold text-ink-muted ${
                    column.numeric ? "w-24 whitespace-nowrap" : ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-line last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-top text-ink-muted ${
                      column.numeric
                        ? "whitespace-nowrap font-medium text-ink"
                        : ""
                    }`}
                    {...(column.numeric ? { "data-numeric": true } : {})}
                  >
                    {row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footnote ? (
        <p className="max-w-measure text-micro text-ink-subtle">{footnote}</p>
      ) : null}
    </Reveal>
  );
}
