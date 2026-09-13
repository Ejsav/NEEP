/**
 * Applies pending migrations. Run with: pnpm db:migrate
 *
 * Uses a dedicated single connection that is closed on exit, so this is safe to
 * run in a deploy step without leaking a pooled client.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * README and CLAUDE.md both document .env.local as the source of DATABASE_URL,
 * but this script never read it, so `pnpm db:migrate` contradicted its own
 * instructions.
 *
 * Loaded best-effort and only as a fallback: dotenv is a devDependency, and this
 * script is meant to be deploy-safe, where devDependencies are absent and the
 * environment is already populated.
 */
async function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
  } catch {
    // No dotenv (production install). The environment is authoritative there.
  }
}

async function main() {
  await loadLocalEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
