import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl, isProduction } from "@/lib/env";
import * as schema from "./schema";

/**
 * A single pooled client per process. Next.js dev reloads modules, so the client
 * is cached on globalThis to avoid exhausting connections during development.
 */
const globalForDb = globalThis as unknown as {
  __neepSql?: ReturnType<typeof postgres>;
};

function client() {
  if (!globalForDb.__neepSql) {
    globalForDb.__neepSql = postgres(databaseUrl(), {
      max: isProduction ? 10 : 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForDb.__neepSql;
}

export const db = drizzle(client(), { schema });
export { schema };
