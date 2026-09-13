import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

/**
 * Thumb-zone action bar, mobile only.
 *
 * Event planning buyers call. Every strong performer in the benchmark set keeps
 * a tappable number within reach on a phone, and this site assumes most traffic
 * arrives on one. Desktop keeps the header actions and hides this entirely.
 *
 * No JavaScript. The phone link renders only when a real number is configured -
 * a fake number on a lead-generation site destroys trust on the one call that
 * mattered, so absence is the honest state. See src/lib/site-config.ts.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps the bar clear of the iOS home
 * indicator. Body padding is applied in the marketing layout so the bar never
 * covers the end of the page.
 */
export function StickyCta({ href = "/start", label = "Start planning" }: {
  href?: string;
  label?: string;
}) {
  const phone = siteConfig.contact.phone;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch gap-2 px-4 py-3">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-line-strong bg-paper-raised px-4 text-small font-medium text-ink transition duration-150 ease-out-quiet active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <PhoneGlyph />
            Call
          </a>
        ) : null}
        <Link
          href={href}
          className="inline-flex min-h-12 flex-[2] items-center justify-center rounded-md bg-accent px-4 text-small font-medium text-accent-ink shadow-subtle transition duration-150 ease-out-quiet active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
