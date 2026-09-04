import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";
import { appSecret } from "@/lib/env";

/**
 * `promisify` picks scrypt's 3-argument overload and drops the options object,
 * so the promisified form is typed explicitly here.
 */
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Password hashing uses Node's built-in scrypt (RFC 7914), a memory-hard KDF.
 * Chosen over argon2 to avoid a native binary dependency in the deploy target;
 * see docs/DECISIONS.md for the tradeoff and the revisit condition.
 *
 * Parameters: N=2^15, r=8, p=1, 64-byte output. N=2^15 with the default
 * maxmem would exceed the limit, so maxmem is raised explicitly.
 */
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })) as Buffer;
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  let derived: Buffer;
  try {
    derived = (await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    })) as Buffer;
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Session tokens are random; a plain SHA-256 lookup hash is sufficient and fast. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Keyed hash of a client IP. Lets us correlate abuse without storing a network
 * identifier. Truncated to 32 hex chars — enough to avoid collisions at our
 * volume, short enough to be cheap to index.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", appSecret())
    .update(`ip:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function hmac(payload: string): string {
  return createHmac("sha256", appSecret()).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
