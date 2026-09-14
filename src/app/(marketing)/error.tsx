"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Error boundary for the public site.
 *
 * Two things this page must do that a generic "something went wrong" does not:
 *
 *  1. Give the visitor a way through. On a lead-generation site an unhandled
 *     error is a lost enquiry, so the recovery actions are a retry and a direct
 *     contact route - never a dead end.
 *  2. Show the incident id. Next puts the server-side error digest on the error
 *     object; printing it is what lets someone who calls in be matched to the
 *     actual stack trace in the logs. Without it the report is "the site broke".
 *
 * The message itself is deliberately not the raw error: that is server detail
 * and it is neither useful nor safe to show.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server already logged this; this is the client half of the same
    // incident, and the digest is what ties the two together.
    console.error("Unhandled error on a public page", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  const { email, phone, phoneDisplay } = siteConfig.contact;

  return (
    <div className="mx-auto flex max-w-content flex-col gap-8 px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex max-w-measure flex-col gap-4">
        <span className="eyebrow">Something broke</span>
        <h1 className="text-display-2 font-display text-ink">
          This page didn&apos;t load.
        </h1>
        <p className="text-body-lg text-ink-muted">
          That is a fault on our side, not something you did. Trying again often
          works — the error has been recorded either way.
        </p>

        <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <Link
            href="/"
            className="text-small font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-accent hover:decoration-accent"
          >
            Back to the homepage
          </Link>
        </div>
      </div>

      <div className="flex max-w-measure flex-col gap-3 rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-heading-2 text-ink">
          If you were in the middle of an enquiry
        </h2>
        <p className="text-small text-ink-muted">
          Nothing you had already sent is lost. If you were part way through the
          planner, your answers are saved and it will pick up where you left off.
        </p>
        {phone || email ? (
          <p className="text-small text-ink-muted">
            If you would rather not start again,{" "}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                call {phoneDisplay ?? phone}
              </a>
            ) : null}
            {phone && email ? " or " : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                email us
              </a>
            ) : null}{" "}
            and we will take it from there.
          </p>
        ) : (
          <ButtonLink href="/plan" variant="secondary">
            Go to the planner
          </ButtonLink>
        )}
        {error.digest ? (
          <p className="text-micro text-ink-subtle">
            Incident reference{" "}
            <span data-numeric className="font-medium text-ink-muted">
              {error.digest}
            </span>
            . Quoting it lets us find exactly what failed.
          </p>
        ) : null}
      </div>
    </div>
  );
}
