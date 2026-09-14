import { Breadcrumbs } from "@/components/site/breadcrumbs";

/**
 * Shared header for the non-pillar pages: breadcrumb, eyebrow, h1, standfirst.
 *
 * Same masthead as the homepage and the pillars - the title runs across the
 * measure, a rule closes it, and the standfirst sits underneath. Pages that
 * have genuine reference material to show at the top pass it as `aside` and it
 * takes the second column; pages that do not get a single-column standfirst
 * rather than a column of nothing.
 *
 * The breadcrumb is rendered here rather than assumed, because BreadcrumbList
 * schema may only be emitted by a page that actually shows the trail.
 */
export function PageHeader({
  eyebrow,
  title,
  standfirst,
  crumb,
  aside,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  crumb: { href: string; label: string };
  aside?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <div className="mx-auto max-w-content px-5 pb-12 pt-4 sm:px-8 sm:pb-16">
        <Breadcrumbs items={[crumb]} />
        <span className="eyebrow mt-6 block">{eyebrow}</span>
        <h1 className="mt-4 max-w-[19ch] text-display-1 font-display text-ink">
          {title}
        </h1>
        <div
          className={
            aside
              ? "mt-10 grid gap-10 border-t border-line pt-8 sm:mt-12 sm:pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"
              : "mt-6"
          }
        >
          <p className="max-w-measure text-body-lg text-ink-muted">{standfirst}</p>
          {aside}
        </div>
      </div>
    </div>
  );
}

/**
 * Constrained column for long-form copy, with an optional section index.
 *
 * A policy is scanned, not read: someone arrives wanting to know whether their
 * IP address is stored and does not want to read ten sections to find out. The
 * index makes that a single click, and it happens to fill the column a
 * measure-width document leaves empty. Pass `index` with an entry per `h2`,
 * and give each of those headings the matching `id`.
 *
 * Sticky rather than fixed, so it scrolls away with its own section on a phone
 * instead of covering the text it points at.
 */
export function Prose({
  children,
  index,
}: {
  children: React.ReactNode;
  index?: { id: string; label: string }[];
}) {
  const body = (
    <div className="flex max-w-measure flex-col gap-6 text-body text-ink-muted [&_h2]:mt-6 [&_h2]:scroll-mt-8 [&_h2]:font-display [&_h2]:text-heading-1 [&_h2]:text-ink [&_h3]:mt-2 [&_h3]:font-display [&_h3]:text-heading-2 [&_h3]:text-ink [&_li]:ml-4 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2">
      {children}
    </div>
  );

  if (!index || index.length === 0) {
    return (
      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">{body}</div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        {body}
        <nav
          aria-label="On this page"
          className="order-first h-fit lg:sticky lg:top-8 lg:order-none"
        >
          <span className="eyebrow text-ink-subtle">On this page</span>
          <ul className="mt-3 flex flex-col border-t border-line">
            {index.map((entry) => (
              <li key={entry.id} className="border-b border-line">
                <a
                  href={`#${entry.id}`}
                  className="block py-2.5 text-small text-ink-muted transition-colors duration-150 hover:text-accent"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
