import type { Metadata } from "next";
import { NotFoundContent } from "@/components/site/not-found-content";

/**
 * 404 for anything inside the marketing shell - a venue slug that does not
 * exist, a region that is not a region. The layout already supplies the header
 * and footer, so this renders the body only.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function MarketingNotFound() {
  return <NotFoundContent />;
}
