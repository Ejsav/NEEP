import type { Metadata } from "next";

/**
 * Admin shell.
 *
 * noindex/nofollow at the layout level so every route beneath it inherits it.
 * robots.txt also disallows /admin, but that is a request to crawlers; this is
 * the directive that actually keeps these pages out of an index.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: { default: "Admin", template: "%s | NEEP Admin" },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-paper-sunk">{children}</div>;
}
