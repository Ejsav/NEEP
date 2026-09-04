import "server-only";
import { headers } from "next/headers";
import { hashIp } from "@/lib/security/hash";

/**
 * Client IP resolution.
 *
 * Order matters. On Vercel, `x-vercel-forwarded-for` is set by the platform and
 * cannot be spoofed by the client. `x-forwarded-for` CAN be spoofed when the app
 * is reachable directly, so it is used only as a fallback and only the
 * left-most entry is read. If the deploy target changes, revisit this list -
 * trusting the wrong header turns per-IP rate limiting into a no-op.
 */
const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

export type RequestContext = {
  ip: string | null;
  ipHash: string | null;
  userAgent: string | null;
};

export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();

  let ip: string | null = null;
  for (const name of IP_HEADERS) {
    const raw = h.get(name);
    if (!raw) continue;
    const first = raw.split(",")[0]?.trim();
    if (first) {
      ip = first;
      break;
    }
  }

  const userAgent = h.get("user-agent")?.slice(0, 400) ?? null;
  return { ip, ipHash: hashIp(ip), userAgent };
}

/**
 * Rate-limit key for a request. Falls back to a shared bucket when no IP is
 * resolvable, so an unidentifiable flood is still throttled rather than exempt.
 */
export function rateLimitKey(prefix: string, ipHash: string | null): string {
  return `${prefix}:${ipHash ?? "unknown"}`;
}
