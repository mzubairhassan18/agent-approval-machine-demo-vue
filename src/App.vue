<script setup lang="ts">
/**
 * The page: a sticky header, the ten use-case sections, and a scroll-spy
 * sidebar. The only interesting code here is the IntersectionObserver — the
 * approval logic lives inside each `<UseCaseSection>`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import SectionSidebar from "./components/SectionSidebar.vue";
import TopBar from "./components/TopBar.vue";
import UseCaseSection from "./components/UseCaseSection.vue";
import { USE_CASES } from "./use-cases";

const sections = computed(() =>
  USE_CASES.map((useCase, index) => ({
    id: useCase.id,
    label: useCase.label,
    n: String(index + 1).padStart(2, "0"),
  })),
);

const activeId = ref(USE_CASES[0]?.id ?? "");
let observer: IntersectionObserver | undefined;

onMounted(async () => {
  await nextTick();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        activeId.value = entry.target.id;
      }
    },
    { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
  );
  for (const useCase of USE_CASES) {
    const el = document.getElementById(useCase.id);
    if (el) observer.observe(el);
  }
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <v-app>
    <TopBar :sections="sections" />

    <div class="shell">
      <main id="top">
        <section class="hero">
          <p class="eyebrow">human-in-the-loop, without a framework</p>
          <h1>Ten real-world approval flows, one 2.5&nbsp;kB store — in Vue&nbsp;3 + Vuetify</h1>
          <p class="lede">
            Every agent ends up rebuilding the same five things: select, edit before approve,
            partial failure with a retry, an undo window, and a queue for items that arrive while a
            tool call is still running. This page runs all ten flows below on
            <code>agent-approval-machine</code>, installed from the published tarball.
          </p>
          <p class="lede">
            The library ships no Vue code at all. The entire binding is one composable —
            <code>useApprovalStore</code> — that keeps a snapshot in a
            <code>shallowRef</code> and subscribes to the store. Everything else on this page is
            Vuetify and ordinary state.
          </p>
        </section>

        <UseCaseSection
          v-for="(useCase, index) in USE_CASES"
          :key="useCase.id"
          :use-case="useCase"
          :index="index"
        />
      </main>

      <SectionSidebar :sections="sections" :active-id="activeId" />
    </div>

    <footer class="footer">
      <span>MIT · zero dependencies · no peer dependencies · built with Vue 3 and Vuetify 3</span>
    </footer>
  </v-app>
</template>
