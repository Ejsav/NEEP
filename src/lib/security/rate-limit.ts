import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitBuckets } from "@/lib/db/schema";

/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * Postgres rather than in-memory because the deploy target is serverless: an
 * in-process counter resets on every cold start and is not shared between
 * instances, which makes it security theatre. See docs/DECISIONS.md.
 *
 * Fixed windows allow up to 2x the limit across a window boundary. That is an
 * accepted tradeoff at this volume; the limits below are set low enough that
 * 2x is still harmless.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
};

export type RateLimitRule = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  /** Public inquiry form, per client IP. */
  inquiryPerIp: { limit: 5, windowSeconds: 60 * 60 } as RateLimitRule,
  /** Public inquiry form, global. A blunt backstop against a distributed flood. */
  inquiryGlobal: { limit: 200, windowSeconds: 60 * 60 } as RateLimitRule,
  /** Admin login attempts, per client IP. */
  loginPerIp: { limit: 10, windowSeconds: 15 * 60 } as RateLimitRule,
  /** Admin login attempts, per submitted account. */
  loginPerAccount: { limit: 5, windowSeconds: 15 * 60 } as RateLimitRule,
} as const;

function windowStartFor(windowSeconds: number, now: Date): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/**
 * Consumes one unit against `key`. Returns whether the caller may proceed.
 *
 * Fails OPEN. A database outage must not silently drop a lead; the surrounding
 * code has its own persistence error handling, and losing rate limiting for the
 * duration of an outage is the lesser harm.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(rule.windowSeconds, now);
  const resetAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
  );

  try {
    const [row] = await db
      .insert(rateLimitBuckets)
      .values({ bucketKey: key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimitBuckets.bucketKey, rateLimitBuckets.windowStart],
        set: { count: sql`${rateLimitBuckets.count} + 1` },
      })
      .returning({ count: rateLimitBuckets.count });

    const count = row?.count ?? 1;
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      limit: rule.limit,
      retryAfterSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] backend unavailable, failing open", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      allowed: true,
      remaining: rule.limit,
      limit: rule.limit,
      retryAfterSeconds,
    };
  }
}

/** Reads the current count without consuming. Used by tests and diagnostics. */
export async function peekRateLimit(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<number> {
  const windowStart = windowStartFor(rule.windowSeconds, now);
  const [row] = await db
    .select({ count: rateLimitBuckets.count })
    .from(rateLimitBuckets)
    .where(
      and(
        eq(rateLimitBuckets.bucketKey, key),
        eq(rateLimitBuckets.windowStart, windowStart),
      ),
    );
  return row?.count ?? 0;
}

/** Housekeeping. Windows older than the cutoff can never be consulted again. */
export async function pruneRateLimits(olderThan: Date): Promise<number> {
  const rows = await db
    .delete(rateLimitBuckets)
    .where(lt(rateLimitBuckets.windowStart, olderThan))
    .returning({ key: rateLimitBuckets.bucketKey });
  return rows.length;
}
