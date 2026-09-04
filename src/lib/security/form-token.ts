import "server-only";
import { randomBytes } from "node:crypto";
import { hmac, safeEqual } from "@/lib/security/hash";

/**
 * Signed form tokens.
 *
 * One mechanism, three jobs:
 *   1. CSRF defence beyond Next's built-in Origin check on Server Actions.
 *   2. Timing check - a form completed in under MIN_AGE was almost certainly
 *      filled by a script, not a person.
 *   3. Staleness check - a token older than MAX_AGE is rejected, which bounds
 *      how long a harvested token stays useful.
 *
 * This is deliberately not a CAPTCHA. Combined with the honeypot and IP rate
 * limiting it removes commodity spam without making a real customer prove
 * they are human. See docs/SECURITY.md.
 */

const MIN_AGE_MS = 2_500;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/security/form-fields";

export function issueFormToken(scope: string, now: Date = new Date()): string {
  const issuedAt = now.getTime();
  const nonce = randomBytes(9).toString("base64url");
  const payload = `${scope}.${issuedAt}.${nonce}`;
  return `${payload}.${hmac(payload)}`;
}

export type FormTokenVerdict =
  | { ok: true }
  | { ok: false; reason: "malformed" | "bad_signature" | "too_fast" | "expired" };

export function verifyFormToken(
  token: string | undefined | null,
  scope: string,
  now: Date = new Date(),
): FormTokenVerdict {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "malformed" };
  }

  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };

  const [tokenScope, issuedAtRaw, nonce, signature] = parts;
  if (tokenScope !== scope) return { ok: false, reason: "malformed" };

  const issuedAt = Number.parseInt(issuedAtRaw, 10);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: "malformed" };

  const expected = hmac(`${tokenScope}.${issuedAtRaw}.${nonce}`);
  if (!safeEqual(signature, expected)) return { ok: false, reason: "bad_signature" };

  const age = now.getTime() - issuedAt;
  // A negative age means clock skew, not an attack. Treat it as valid.
  if (age >= 0 && age < MIN_AGE_MS) return { ok: false, reason: "too_fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };

  return { ok: true };
}

/** A filled honeypot means a bot filled every field it could see. */
export function honeypotTripped(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}
