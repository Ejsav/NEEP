"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. Catches errors thrown by the root layout itself, which
 * means it REPLACES that layout - it has to render its own <html> and <body>.
 *
 * Deliberately dependency-free and styled inline. If the root layout is what
 * failed, the font loader, the stylesheet and the design tokens are all suspect,
 * so this page hardcodes the palette rather than reading variables that may
 * never have been defined. It should render correctly with nothing but HTML.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.25rem",
          backgroundColor: "#faf7f2",
          color: "#1c1917",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "#78716c",
            }}
          >
            New England Event Planners
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "2rem",
              lineHeight: 1.1,
              letterSpacing: "-0.018em",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 600,
            }}
          >
            The site failed to load.
          </h1>
          <p style={{ margin: "1rem 0 0", color: "#57534e" }}>
            This is a fault on our side. Reloading usually clears it, and the
            error has been recorded either way.
          </p>
          <p style={{ margin: "1.5rem 0 0" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                minHeight: "3.25rem",
                padding: "0 1.75rem",
                borderRadius: "0.375rem",
                backgroundColor: "#7a1e2e",
                color: "#ffffff",
                font: "inherit",
                fontWeight: 500,
              }}
            >
              Reload the page
            </button>
          </p>
          {error.digest ? (
            <p style={{ margin: "1.5rem 0 0", fontSize: "0.8125rem", color: "#78716c" }}>
              Incident reference{" "}
              <span style={{ fontVariantNumeric: "tabular-nums", color: "#57534e" }}>
                {error.digest}
              </span>
              .
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
