import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAdmin, type AuthedAdmin } from "@/lib/auth/session";

/**
 * The authorization boundary for the admin area.
 *
 * Called at the top of every admin page and every admin action - not only in
 * the layout. A layout guard alone is not a boundary: Server Actions and route
 * segments are reachable independently of the layout that renders them, and
 * Next's own docs are explicit that render-time gating is not a security check.
 */
export async function requireAdmin(): Promise<AuthedAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For actions, where redirecting mid-mutation is the wrong shape. */
export async function requireAdminOrNull(): Promise<AuthedAdmin | null> {
  return getCurrentAdmin();
}
