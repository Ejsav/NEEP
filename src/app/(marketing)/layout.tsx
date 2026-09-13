import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { StickyCta } from "@/components/site/sticky-cta";

/**
 * Public marketing shell. A Server Component with no client boundary, so these
 * pages ship no JavaScript beyond what an individual island opts into.
 *
 * The footer carries bottom padding on small screens so the sticky action bar
 * never covers the last line of the page.
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
      <div className="pb-20 sm:pb-0">
        <SiteFooter />
      </div>
      <StickyCta />
    </div>
  );
}
