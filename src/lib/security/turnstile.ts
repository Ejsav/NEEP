import "server-only";

/**
 * Cloudflare Turnstile, optional by design.
 *
 * Follows the same contract as the notification outbox (see src/lib/notify):
 * an integration that is not configured says so plainly and degrades to a
 * defined behaviour. It never pretends to have run.
 *
 * With no keys set, the widget does not render and verification returns
 * `configured: false, ok: true`. The planner is still defended by three other
 * layers that do not depend on a third party: the honeypot, the signed form
 * token, and Postgres-backed IP rate limiting. Turnstile hardens that; it is
 * not load-bearing on its own.
 *
 * Never a visible CAPTCHA. Making a customer prove they are human on a
 * lead-generation form costs real inquiries.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 4_000;

export const TURNSTILE_FIELD = "cf-turnstile-response";

export function turnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

function turnstileSecret(): string | null {
  const key = process.env.TURNSTILE_SECRET_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

/** True only when BOTH halves are present. One key alone cannot verify anything. */
export function turnstileConfigured(): boolean {
  return turnstileSiteKey() !== null && turnstileSecret() !== null;
}

export type TurnstileResult = {
  configured: boolean;
  ok: boolean;
  reason?: string;
};

export async function verifyTurnstile(
  token: string | undefined | null,
): Promise<TurnstileResult> {
  const secret = turnstileSecret();
  if (!secret || turnstileSiteKey() === null) {
    return { configured: false, ok: true };
  }

  if (typeof token !== "string" || token.trim() === "") {
    return { configured: true, ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Cloudflare being down must not take the inquiry form down with it.
      // Losing a lead is the worse outcome; this matches the fail-open posture
      // of the rate limiter. See docs/ARCHITECTURE.md, failure posture.
      console.error("[turnstile] verify endpoint returned %s", response.status);
      return { configured: true, ok: true, reason: "verify_unavailable" };
    }

    const data = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (data.success === true) return { configured: true, ok: true };

    return {
      configured: true,
      ok: false,
      reason: data["error-codes"]?.join(",") ?? "rejected",
    };
  } catch (error) {
    console.error("[turnstile] verify failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { configured: true, ok: true, reason: "verify_error" };
  }
}
