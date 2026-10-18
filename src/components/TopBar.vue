<script setup lang="ts">
defineProps<{ sections: { id: string; label: string; n: string }[] }>();
</script>

<template>
  <header class="topbar">
    <a class="brand" href="#top">
      <span class="brand-mark">✓</span>
      <span>agent-approval-machine</span>
    </a>

    <nav class="topnav">
      <a href="https://www.npmjs.com/package/agent-approval-machine" target="_blank" rel="noreferrer">
        npm
      </a>
      <a
        href="https://github.com/mzubairhassan18/agent-approval-machine"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
      <a
        href="https://github.com/mzubairhassan18/agent-approval-machine-demo-nextjs"
        target="_blank"
        rel="noreferrer"
      >
        Next.js demo
      </a>
      <a
        href="https://github.com/mzubairhassan18/agent-approval-machine-demo-angular"
        target="_blank"
        rel="noreferrer"
      >
        Angular demo
      </a>
    </nav>

    <nav class="topnav topnav-anchors" aria-label="Sections">
      <a v-for="section in sections" :key="section.id" :href="`#${section.id}`">{{ section.n }}</a>
    </nav>
  </header>
</template>
