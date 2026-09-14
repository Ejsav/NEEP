import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";

export function AdminBar({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  return (
    <div className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/inquiries"
            className="font-display text-heading-2 leading-none text-ink hover:text-accent"
          >
            NEEP Admin
          </Link>
          {/*
            Two sections, so it is a plain row rather than a navigation pattern
            waiting for a third. `aria-label` because "Inquiries / Funnel" is
            not self-evidently the admin's own navigation next to the wordmark.
          */}
          <nav aria-label="Admin" className="flex items-center gap-4 text-small">
            <Link href="/admin/inquiries" className="text-ink-muted hover:text-accent">
              Inquiries
            </Link>
            <Link href="/admin/funnel" className="text-ink-muted hover:text-accent">
              Funnel
            </Link>
          </nav>
          <Link
            href="/"
            className="text-micro text-ink-subtle underline underline-offset-4 hover:text-accent"
          >
            View site
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-micro text-ink-muted">
            {user.name}{" "}
            <span className="text-ink-subtle">({user.role})</span>
          </span>
          {/* A real POST, so a stray GET can never sign someone out. */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-md px-3 text-micro font-medium text-ink-muted underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
