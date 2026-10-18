<script setup lang="ts">
defineProps<{
  sections: { id: string; label: string; n: string }[];
  activeId: string;
}>();
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-inner">
      <p class="sidebar-label">Use cases</p>
      <nav class="toc">
        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          :class="{ active: section.id === activeId }"
        >
          <span class="n">{{ section.n }}</span>
          <span>{{ section.label }}</span>
        </a>
      </nav>

      <p class="sidebar-label">The core</p>
      <ul class="linklist">
        <li>
          <a href="https://www.npmjs.com/package/agent-approval-machine" target="_blank" rel="noreferrer">
            npm — agent-approval-machine
          </a>
        </li>
        <li>
          <a href="https://github.com/mzubairhassan18/agent-approval-machine" target="_blank" rel="noreferrer">
            README &amp; API
          </a>
        </li>
        <li>
          <a href="https://mzubairhassan18.github.io/agent-approval-machine/" target="_blank" rel="noreferrer">
            Vanilla Pages demo
          </a>
        </li>
        <li>
          <a
            href="https://github.com/mzubairhassan18/agent-approval-machine-demo-nextjs"
            target="_blank"
            rel="noreferrer"
          >
            React / Next.js demo
          </a>
        </li>
        <li>
          <a
            href="https://github.com/mzubairhassan18/agent-approval-machine-demo-angular"
            target="_blank"
            rel="noreferrer"
          >
            Angular demo
          </a>
        </li>
      </ul>

      <p class="sidebar-note">
        This page is Vue 3 + Vuetify. The store underneath is identical to the vanilla
        <code>&lt;script&gt;</code> demo — only the last ~10 lines are framework code.
      </p>
    </div>
  </aside>
</template>
