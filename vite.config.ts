import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/**
 * No vite-plugin-vuetify on purpose: the Vuetify components this demo uses are
 * registered explicitly in `src/vuetify.ts`, so the build has no transform
 * plugin to configure and nothing to go wrong at integration time.
 */
export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
