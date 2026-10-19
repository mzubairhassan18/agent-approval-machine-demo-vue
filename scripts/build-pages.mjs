#!/usr/bin/env node
/**
 * Builds the demo as static files and writes them to `docs/`, which is the
 * folder GitHub Pages serves (source: main, /docs). Commit the result.
 *
 *   npm run build:pages && git add docs && git commit -m "chore: rebuild pages"
 *
 * Vite's `base: "./"` already emits relative asset URLs, so one build works
 * both at the root (npm run dev / vite preview) and under the Pages subpath
 * https://mzubairhassan18.github.io/agent-approval-machine-demo-vue/
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const DIST = "dist";
const DOCS = "docs";

execSync("npm run build", { stdio: "inherit" });

if (!existsSync(`${DIST}/index.html`)) {
  console.error(`\nNo ${DIST}/index.html — the build did not produce a site.`);
  process.exit(1);
}

rmSync(DOCS, { recursive: true, force: true });
mkdirSync(DOCS, { recursive: true });
cpSync(DIST, DOCS, { recursive: true });

// Pages runs Jekyll, which silently drops any folder starting with `_`.
// Nothing here uses one today, but opting out keeps it that way.
writeFileSync(`${DOCS}/.nojekyll`, "");

console.log(`\nWrote ${DOCS}/. Commit it and Pages redeploys.`);
