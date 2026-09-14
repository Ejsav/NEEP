import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { NotFoundContent } from "@/components/site/not-found-content";

/**
 * Root 404. Reached for any URL that matches no route at all, which means it
 * renders inside the root layout with no site chrome of its own - so it brings
 * the header and footer itself.
 *
 * Noindex is deliberate and belongs here rather than being assumed: Next serves
 * this with a 404 status, but a soft 404 that a crawler reaches through a stale
 * link should never be a candidate for indexing either.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  );
}
