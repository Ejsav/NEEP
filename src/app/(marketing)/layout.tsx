import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

/**
 * Public marketing shell. A Server Component with no client boundary, so these
 * pages ship no JavaScript beyond what an individual island opts into.
 *
 * The mobile action bar is rendered by the pages that want it, not here: it
 * must not appear on /plan, where the planner is already the call to action.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
