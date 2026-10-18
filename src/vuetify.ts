/**
 * Vuetify, registered the boring way.
 *
 * `vite-plugin-vuetify` is optional: it only auto-imports components and
 * generates styles. Importing the components this page uses and handing them to
 * `createVuetify` keeps the plugin count at one (`@vitejs/plugin-vue`) and
 * makes the surface area explicit — you can read exactly what is registered.
 */
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

import { createVuetify } from "vuetify";
import type { ThemeDefinition } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import {
  VApp,
  VBtn,
  VChip,
  VCheckboxBtn,
  VProgressLinear,
  VTextarea,
  VTextField,
} from "vuetify/components";
import * as directives from "vuetify/directives";

/**
 * The palette from the vanilla Pages demo, so the three framework demos look
 * like siblings: #0b0d12 background, #12151d panels, #232838 borders,
 * #6ee7a8 accent, monospace for metadata.
 */
const approvalDark: ThemeDefinition = {
  dark: true,
  colors: {
    background: "#0b0d12",
    surface: "#12151d",
    primary: "#6ee7a8",
    secondary: "#7db2ff",
    error: "#ff8a8a",
    info: "#7db2ff",
    success: "#6ee7a8",
    warning: "#ffca7a",
    "on-primary": "#052014",
    "on-background": "#e8ebf2",
    "on-surface": "#e8ebf2",
    "surface-variant": "#171b25",
    "on-surface-variant": "#98a1b5",
    outline: "#232838",
  },
};

export const vuetify = createVuetify({
  theme: {
    defaultTheme: "approvalDark",
    themes: { approvalDark },
  },
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  components: {
    VApp,
    VBtn,
    VChip,
    VCheckboxBtn,
    VProgressLinear,
    VTextarea,
    VTextField,
  },
  directives,
});
