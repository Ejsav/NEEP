import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl, isProduction } from "@/lib/env";
import * as schema from "./schema";

/**
 * A single pooled client per process, created on first use.
 *
 * LAZY ON PURPOSE. This module used to call databaseUrl() at module scope,
 * which meant merely importing `db` demanded a connection string. Next's
 * page-data collection imports the module graph for every dynamic route, so a
 * production build failed outright without DATABASE_URL set - even though not
 * one page queries the database at build time. That turned an ordinary deploy,
 * where build-time env is often absent, into a hard failure with a stack trace
 * pointing at env.ts rather than at the real cause.
 *
 * Building an application should never require a live database. Now the
 * connection is opened the first time a query actually runs, so a missing
 * DATABASE_URL surfaces as a request-time error with the same clear message,
 * which is where it belongs.
 *
 * Next.js dev reloads modules, so the client is cached on globalThis to avoid
 * exhausting connections during development.
 */
const globalForDb = globalThis as unknown as {
  __neepSql?: ReturnType<typeof postgres>;
  __neepDb?: ReturnType<typeof drizzle<typeof schema>>;
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

function instance() {
  if (!globalForDb.__neepDb) {
    globalForDb.__neepDb = drizzle(client(), { schema });
  }
  return globalForDb.__neepDb;
}

/**
 * Behaves exactly like the Drizzle client. The proxy exists only to defer
 * construction until the first property access, so callers are unchanged.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, property) {
    const target = instance();
    const value = Reflect.get(target, property);
    // Methods must keep their receiver, or `this` inside Drizzle is the proxy.
    return typeof value === "function" ? value.bind(target) : value;
  },
  has(_target, property) {
    return Reflect.has(instance(), property);
  },
});

export { schema };
