import { config } from "dotenv";

/**
 * Loads .env.local so database-backed tests run against the same connection the
 * dev server uses. Tests that touch the database are skipped, loudly, when
 * DATABASE_URL is absent rather than silently passing.
 */
config({ path: ".env.local", quiet: true });

if (!process.env.APP_SECRET) {
  process.env.APP_SECRET = "test-only-secret-not-used-outside-vitest-0123456789";
}
