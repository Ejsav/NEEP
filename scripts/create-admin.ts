/**
 * Creates or updates an admin user. Run with: pnpm admin:create
 *
 * Credentials come from the environment, never from a committed default:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE (owner|staff)
 *
 * There is no seeded default account anywhere in this codebase. A known
 * default password on a system holding customer contact details is a breach
 * waiting for someone to notice.
 */
import {
  randomBytes,
  scrypt as scryptCb,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password.normalize("NFKC"), salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2,
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

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set.");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();
  const role = (process.env.ADMIN_ROLE ?? "owner").trim();

  if (!email || !email.includes("@")) fail("ADMIN_EMAIL must be a valid email.");
  if (!password || password.length < 12) {
    fail("ADMIN_PASSWORD must be at least 12 characters.");
  }
  if (!name) fail("ADMIN_NAME is required.");
  if (role !== "owner" && role !== "staff") {
    fail("ADMIN_ROLE must be 'owner' or 'staff'.");
  }

  const passwordHash = await hashPassword(password);
  const sql = postgres(url!, { max: 1 });

  try {
    const rows = await sql`
      insert into admin_users (email, password_hash, name, role)
      values (${email}, ${passwordHash}, ${name}, ${role}::admin_role)
      on conflict (email) do update
        set password_hash = excluded.password_hash,
            name = excluded.name,
            role = excluded.role,
            is_active = true,
            updated_at = now()
      returning id, email, role
    `;
    const created = rows[0];
    console.log(`Admin ready: ${created.email} (${created.role})`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
