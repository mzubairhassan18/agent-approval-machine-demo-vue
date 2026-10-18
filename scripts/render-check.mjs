/**
 * render-check — the other half of store-check.
 *
 * `store-check.mjs` proves the state machine works headless. This one proves the
 * Vue page actually renders it: it boots the Vite SSR pipeline, renders
 * `src/App.vue` through `vue/server-renderer`, and asserts on the markup — all
 * ten sections, the flag chips, the formatted money, the slot, the risk badge,
 * the sidebar. Any unresolved component or template mistake shows up as a Vue
 * warning and fails the run.
 *
 * Run with:  npm run render:check
 */
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const root = fileURLToPath(new URL("..", import.meta.url));

console.log("render-check: src/App.vue through vue/server-renderer\n");

const warnings = [];
const server = await createServer({
  root,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true },
  // Vuetify's components import their own CSS; noExternal makes Vite compile
  // them for SSR instead of handing them to Node's ESM loader.
  ssr: { noExternal: ["vuetify"] },
});

let failures = 0;
let total = 0;

function check(name, ok) {
  total += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok " : "FAIL "} ${name}`);
}

try {
  const { default: App } = await server.ssrLoadModule("/src/App.vue");
  const { vuetify } = await server.ssrLoadModule("/src/vuetify.ts");

  const app = createSSRApp(App);
  app.config.warnHandler = (message) => warnings.push(message);
  app.use(vuetify);

  const html = await renderToString(app);

  check("hero rendered", html.includes("Ten real-world approval flows"));
  check("all ten sections", (html.match(/class="uc[ "]/g) ?? []).length === 10);
  check("first section has its id", html.includes('id="support-replies"'));
  check("last section has its id", html.includes('id="ad-campaigns"'));
  check("flag chip in the on state", html.includes("canSelect true"));
  check("flag chip in the off state", html.includes("canEdit false"));
  check("approve button label", html.includes("Approve all open (3)"));
  check(
    "summary line",
    html.includes("3 open · 0 edited · 0 sending · 0 recallable · 0 failed"),
  );
  check("money formatted as €1,234.00", html.includes("€249.00") && html.includes("€12,200.00"));
  check("slot in the subtitle", html.includes("slot: Thu 15:00 CET"));
  check("risk badge", /class="[^"]*\brisk\b[^"]*"/.test(html));
  check("status badge", html.includes("needs approval"));
  check("row checkbox", html.includes('type="checkbox"'));
  check("editable field with its label", html.includes('aria-label="Reply body"'));
  check("number field for the money flows", html.includes('type="number"'));
  check("sidebar links to sections", html.includes('href="#gdpr"'));
  check("header links to npm", html.includes("npmjs.com/package/agent-approval-machine"));
} finally {
  await server.close();
}

const real = warnings.filter((warning) => !/deprecat|hydration/i.test(warning));
if (real.length) {
  console.log("\nVue warnings:");
  for (const warning of real) console.log(`  - ${warning}`);
}

console.log(
  `\nrender-check: ${total - failures}/${total} checks passed, ${real.length} Vue warnings\n`,
);
process.exitCode = failures || real.length ? 1 : 0;
