import { Breadcrumbs } from "@/components/site/breadcrumbs";

/**
 * Shared header for the non-pillar pages: breadcrumb, eyebrow, h1, standfirst.
 *
 * The breadcrumb is rendered here rather than assumed, because BreadcrumbList
 * schema may only be emitted by a page that actually shows the trail.
 */
export function PageHeader({
  eyebrow,
  title,
  standfirst,
  crumb,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  crumb: { href: string; label: string };
}) {
  return (
    <div className="border-b border-line">
      <div className="mx-auto max-w-content px-5 pb-12 pt-6 sm:px-8 sm:pb-16">
        <Breadcrumbs items={[crumb]} />
        <div className="mt-6 flex max-w-measure flex-col gap-4">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="text-display-1 font-display text-ink">{title}</h1>
          <p className="text-body-lg text-ink-muted">{standfirst}</p>
        </div>
      </div>
    </div>
  );
}

/** Constrained column for long-form copy. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex max-w-measure flex-col gap-6 text-body text-ink-muted [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-heading-1 [&_h2]:text-ink [&_h3]:mt-2 [&_h3]:font-display [&_h3]:text-heading-2 [&_h3]:text-ink [&_li]:ml-4 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </div>
  );
}
