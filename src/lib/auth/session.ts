import "server-only";
import { cookies } from "next/headers";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminSessions, adminUsers, auditLog } from "@/lib/db/schema";
import type { AdminUser } from "@/lib/db/schema";
import { isProduction } from "@/lib/env";
import {
  hashSessionToken,
  newSessionToken,
  verifyPassword,
} from "@/lib/security/hash";
import type { RequestContext } from "@/lib/security/request-context";

/**
 * Admin authentication.
 *
 * Server-side sessions rather than stateless JWTs, because revocation has to be
 * immediate: an admin session can see every customer's contact details, and a
 * token that stays valid until it expires is not something we want to explain
 * after a laptop goes missing.
 *
 * Two expiry clocks:
 *   absolute - a hard ceiling; the session dies at this time no matter what.
 *   idle     - rolls forward on each authenticated request.
 *
 * The cookie holds a random token; only its SHA-256 is stored. A database leak
 * therefore does not hand over usable sessions.
 */

const SESSION_COOKIE = isProduction ? "__Host-neep_admin" : "neep_admin";
const ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000;
const IDLE_TTL_MS = 2 * 60 * 60 * 1000;

export type AuthedAdmin = {
  user: Pick<AdminUser, "id" | "email" | "name" | "role">;
  sessionId: string;
};

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    expires,
  };
}

export type LoginResult =
  | { ok: true; user: AuthedAdmin["user"] }
  | { ok: false; reason: "invalid_credentials" | "inactive" };

/**
 * Verifies credentials and, on success, establishes a session.
 *
 * Always performs a password verification even when the account does not exist,
 * so response timing does not reveal which emails are registered.
 */
export async function login(
  email: string,
  password: string,
  context: RequestContext,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized))
    .limit(1);

  // Dummy hash so the "no such user" path costs the same as a wrong password.
  const hashToCheck =
    user?.passwordHash ??
    "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  const passwordOk = await verifyPassword(password, hashToCheck);

  if (!user || !passwordOk) {
    await recordAudit({
      actorUserId: user?.id ?? null,
      actorLabel: normalized,
      action: "admin.login.failed",
      ipHash: context.ipHash,
      metadata: { reason: user ? "bad_password" : "unknown_account" },
    });
    return { ok: false, reason: "invalid_credentials" };
  }

  if (!user.isActive) {
    await recordAudit({
      actorUserId: user.id,
      actorLabel: user.email,
      action: "admin.login.blocked",
      ipHash: context.ipHash,
      metadata: { reason: "inactive" },
    });
    // Same message as a bad password: a deactivated account should not be
    // distinguishable from a nonexistent one to an attacker.
    return { ok: false, reason: "invalid_credentials" };
  }

  const token = newSessionToken();
  const now = new Date();

  await db.insert(adminSessions).values({
    tokenHash: hashSessionToken(token),
    userId: user.id,
    absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_TTL_MS),
    idleExpiresAt: new Date(now.getTime() + IDLE_TTL_MS),
    lastSeenAt: now,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
  });

  await db
    .update(adminUsers)
    .set({ lastLoginAt: now })
    .where(eq(adminUsers.id, user.id));

  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    token,
    cookieOptions(new Date(now.getTime() + ABSOLUTE_TTL_MS)),
  );

  await recordAudit({
    actorUserId: user.id,
    actorLabel: user.email,
    action: "admin.login.success",
    ipHash: context.ipHash,
  });

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

/**
 * Resolves the current session, or null.
 *
 * Also slides the idle window forward. Called on every admin request, so it is
 * a single indexed lookup plus one narrow update.
 */
export async function getCurrentAdmin(): Promise<AuthedAdmin | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const tokenHash = hashSessionToken(token);

  const [row] = await db
    .select({
      sessionId: adminSessions.id,
      absoluteExpiresAt: adminSessions.absoluteExpiresAt,
      idleExpiresAt: adminSessions.idleExpiresAt,
      revokedAt: adminSessions.revokedAt,
      userId: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(eq(adminSessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.absoluteExpiresAt <= now) return null;
  if (row.idleExpiresAt <= now) return null;
  // Deactivating a user must take effect on their next request, not at expiry.
  if (!row.isActive) return null;

  await db
    .update(adminSessions)
    .set({
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + IDLE_TTL_MS),
    })
    .where(eq(adminSessions.id, row.sessionId));

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      role: row.role,
    },
  };
}

export async function logout(context: RequestContext): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    const [revoked] = await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.tokenHash, tokenHash))
      .returning({ userId: adminSessions.userId });

    if (revoked) {
      await recordAudit({
        actorUserId: revoked.userId,
        actorLabel: "admin",
        action: "admin.logout",
        ipHash: context.ipHash,
      });
    }
  }

  jar.delete(SESSION_COOKIE);
}

/** Housekeeping: sessions that can never be valid again. */
export async function pruneExpiredSessions(now: Date = new Date()): Promise<number> {
  const rows = await db
    .delete(adminSessions)
    .where(
      or(
        lt(adminSessions.absoluteExpiresAt, now),
        and(isNull(adminSessions.revokedAt), lt(adminSessions.idleExpiresAt, now)),
      ),
    )
    .returning({ id: adminSessions.id });
  return rows.length;
}

export async function recordAudit(entry: {
  actorUserId?: string | null;
  actorLabel: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      actorLabel: entry.actorLabel,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ipHash: entry.ipHash ?? null,
    });
  } catch (error) {
    // Audit logging must never break the operation it is recording.
    console.error("[audit] write failed", {
      action: entry.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
