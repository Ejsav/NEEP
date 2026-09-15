/**
 * Proves the public trading name is a single-value change.
 *
 * The brand is provisional (`siteConfig.name`, D-025). A rename is only cheap
 * if nothing hardcodes the string, and "nothing hardcodes it" is the kind of
 * claim that quietly stops being true the first time someone writes a meta
 * description by hand. So it is checked rather than trusted.
 *
 * Deliberately a source scan, not a rendered-output scan: a rendered check
 * needs a build and a server, and this needs to be cheap enough to sit inside
 * `pnpm verify`. The rendered version is worth doing once by hand at rename
 * time - the procedure is in D-025.
 *
 * Usage: node scripts/brand-check.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();

/**
 * Files allowed to contain the literal, each for a stated reason. An exception
 * with its justification next to it is one somebody will reconsider; a silent
 * one is not.
 */
const ALLOWED = new Map([
  [
    "src/lib/site-config.ts",
    "Defines it. This is the single source of truth.",
  ],
  [
    "src/app/icon.svg",
    "A static file the build serves verbatim; it cannot read siteConfig. Note " +
      "that this one is NOT a string change at rename time - the mark is an " +
      "'N' monogram and needs redrawing, not find-and-replace.",
  ],
  [
    "src/app/global-error.tsx",
    "Replaces the root layout when the module graph is suspect. Importing " +
      "anything to render an error page is how an error page fails to render.",
  ],
]);

function brandFromConfig() {
  const source = readFileSync(join(ROOT, "src/lib/site-config.ts"), "utf8");
  const match = source.match(/\n\s*name:\s*"([^"]+)"/);
  if (!match) throw new Error("Could not read `name` from src/lib/site-config.ts");
  return match[1];
}

const brand = brandFromConfig();

// `git grep -l` rather than a manual walk: it honours .gitignore for free, so
// .next and node_modules never enter the picture.
let files = [];
try {
  files = execSync(`git grep -lF ${JSON.stringify(brand)} -- src docs public`, {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
} catch (error) {
  // git grep exits 1 when there are no matches, which is a pass, not a failure.
  if (error.status !== 1) throw error;
}

// Documentation is prose about the company and may name it freely.
const offenders = files.filter(
  (file) => !ALLOWED.has(file) && !file.startsWith("docs/"),
);

console.log(`Brand check — "${brand}"`);
console.log(`${files.length} file(s) contain the literal\n`);

for (const [file, reason] of ALLOWED) {
  console.log(`ALLOWED  ${file}\n         ${reason}`);
}

if (offenders.length > 0) {
  console.log("");
  for (const file of offenders) {
    console.log(`FAIL     ${file}  hardcodes the brand; read siteConfig.name instead`);
  }
  console.log(
    `\n${offenders.length} file(s) would need editing to rename the company. ` +
      "The rename is meant to be one value.",
  );
  process.exit(1);
}

console.log("\nPASS  the public name is a single-value change.");
