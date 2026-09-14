import Link from "next/link";

/**
 * Visible breadcrumbs.
 *
 * BreadcrumbList schema is only emitted by pages that also render this, because
 * marking up navigation the visitor cannot see violates the structured-data
 * visibility guideline. See docs/DECISIONS.md D-012.
 */
export function Breadcrumbs({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-micro text-ink-subtle">
        <li>
          <Link
            href="/"
            className="underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
          >
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {index === items.length - 1 ? (
              <span aria-current="page" className="text-ink-muted">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
