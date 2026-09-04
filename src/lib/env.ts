/**
 * Environment access. Server-only.
 *
 * Rules:
 *  - Nothing in this module may be imported from a Client Component.
 *  - Required vars fail loudly at first use, not silently at request time.
 *  - Optional integrations degrade to an honest, observable no-op rather than
 *    pretending to have succeeded.
 */
import "server-only";

class MissingEnvError extends Error {
  constructor(name: string, hint: string) {
    super(`Missing required environment variable ${name}. ${hint}`);
    this.name = "MissingEnvError";
  }
}

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") throw new MissingEnvError(name, hint);
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

/** Canonical public origin, no trailing slash. Used for canonical URLs and sitemap. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function databaseUrl(): string {
  return required(
    "DATABASE_URL",
    "Set a PostgreSQL connection string, e.g. postgres://user:pass@host:5432/db",
  );
}

/**
 * Server-side secret used to key HMACs: form tokens, IP hashing, session token
 * hashing. Must be at least 32 bytes of entropy. Never sent to the client.
 */
export function appSecret(): string {
  const secret = required(
    "APP_SECRET",
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
  );
  if (secret.length < 32) {
    throw new Error("APP_SECRET must be at least 32 characters of high-entropy material.");
  }
  return secret;
}

/** Where new-inquiry notifications are sent. */
export function notificationRecipient(): string | undefined {
  return optional("INQUIRY_NOTIFICATION_EMAIL");
}

/** Transactional email. Absent = notifications are recorded but not delivered. */
export function resendConfig(): { apiKey: string; from: string } | undefined {
  const apiKey = optional("RESEND_API_KEY");
  const from = optional("EMAIL_FROM");
  if (!apiKey || !from) return undefined;
  return { apiKey, from };
}

/** Hours within which the company commits to responding to a new inquiry. */
export function responseSlaHours(): number {
  const raw = optional("RESPONSE_SLA_HOURS");
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}
