/**
 * Runs the production build with DATABASE_URL deliberately absent.
 *
 * Building an application must never require a live database. This exists
 * because it silently did: `db` was constructed at module scope, Next's
 * page-data collection imports the module graph for every dynamic route, and
 * the deploy failed with a stack trace pointing at env.ts. Local builds always
 * had DATABASE_URL set, so nothing caught it until a real deploy did.
 *
 * Running the build this way makes that class of regression impossible to
 * reintroduce unnoticed. A Node wrapper rather than `env -u` so it works on
 * Windows as well as CI.
 */
import { spawn } from "node:child_process";

const env = { ...process.env };
delete env.DATABASE_URL;
// Keep the rest: a build may legitimately need APP_SECRET or the public vars.

const child = spawn("npx", ["next", "build"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 1));
