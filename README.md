# agent-approval-machine — Vue 3 + Vuetify demo

Ten real-world human-in-the-loop approval flows, built on
[`agent-approval-machine`](https://www.npmjs.com/package/agent-approval-machine) and rendered with
**Vue 3.5 + Vuetify 3.7 + Vite 6 + TypeScript**.

**Live: https://mzubairhassan18.github.io/agent-approval-machine-demo-vue/**

This is one of three parallel demos. The React/Next.js and Angular demos render **exactly the same
ten use cases, in the same order, with the same items, flags, failure messages and arrival timing** —
only the framework glue differs. That is the point of the library: the state is portable, the UI is
yours.

---

## What the demo shows

Every agent that asks a human for permission ends up rebuilding the same five things:

1. **select** one item or all open items
2. **edit** the payload before approving it
3. **partial failure** — 2 of 3 succeed, one fails, and you retry only that one
4. an **undo window** with a live countdown, so a wrong tap is recoverable
5. a **queue** for items that arrive while a batch is still in flight

`agent-approval-machine` is those five conditions as a single headless store — **zero dependencies,
zero CSS, zero UI, zero framework imports.** This page drives ten stores (one per use case) through
Vuetify components, and the entire Vue-specific code is **one ~10-line composable**.

What you get on the page:

- a **sticky header** with links to npm, the GitHub repo, the sibling demos, and the ten sections
- **ten numbered sections**, each with its blurb, its flag chips (`canSelect`, `canEdit`, `canUndo`,
  `undoMs` — the switched-off ones are struck through), a toolbar, and its rows
- a **toolbar** whose primary button reads `Approve selected (n)` when something is selected and
  `Approve all open (n)` otherwise, plus `Deny selected`, `Retry n failed`, a live summary line
  (`3 open · 1 edited · 1 sending · 0 recallable · 1 failed`) and `Reset`
- **rows** with a checkbox, title, metadata subtitle (money formatted as `€1,234.00`, the chosen
  `slot`), a risk badge, an inline edit field shown only while the row is open, the failure message
  inline when it fails, a status badge, and — while recallable — a **live countdown (`4.3s`)** next
  to a **Recall** button
- a **queue banner** when new items land mid-batch: *"N new item(s) arrived while a batch was in
  flight — held as `queued` and released when it settles."* with a `Clear queue` button
- a **sticky sidebar** of the ten sections, highlighted as you scroll (IntersectionObserver)

The provider is faked: the executor waits `700 + 260 × batch.length` ms, then partitions the batch
into `{ succeeded, failed }` using that use case's `fail` map. Where a use case declares an
`arrival`, the **first** execute schedules an `addItems` call partway through the batch — so you can
watch an item land as `queued` and get promoted the moment the batch settles.

---

## How to run it

```bash
npm install          # installs agent-approval-machine ^0.1.0 from npm
npm run dev          # http://localhost:5173
```

| script                 | what it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run dev`          | Vite dev server                                                          |
| `npm run build`        | `vue-tsc --noEmit` typecheck, then the production Vite build             |
| `npm run preview`      | serve the built `dist/`                                                  |
| `npm run typecheck`    | `vue-tsc --noEmit`                                                       |
| `npm run store:check`  | headless Node check of the store — no DOM, no framework, no bundler       |
| `npm run render:check` | renders `src/App.vue` through `vue/server-renderer` and asserts on the markup |
| `npm run build:pages`  | builds, then writes the site to `docs/` for GitHub Pages                  |

### Where the live demo comes from

No CI and no external host. `npm run build:pages` builds the site and writes it to `docs/`, which
GitHub Pages serves (source: `main`, `/docs`):

```bash
npm run build:pages
git add docs && git commit -m "chore: rebuild pages" && git push
```

Vite's `base: "./"` already emits relative asset URLs, so one build works both at the root
(`vite preview`) and under the Pages subpath. The script also writes `docs/.nojekyll`, so Pages'
Jekyll step cannot silently drop files.

### The store check

`scripts/store-check.mjs` is the proof that the package is doing the work rather than the UI. It
builds a store with three items, approves against an executor that fails `b`, and asserts:

```
store-check: agent-approval-machine (headless, no DOM)

  ok  getSnapshot() is referentially stable until state changes
  ok  three items start as needs_approval
  ok  select(id) adds the id to selectedIds
  ok  select(id) again toggles it back off
  ok  selectAll() picks every open item
  ok  selectAll() again clears the selection
  ok  edit() flips the item to editing and marks it edited
  ok  approve() reports 2 succeeded and 1 failed
  ok  the executor received the edited payload
  ok  successes sit in the undo window, the failure carries its error
  ok  retryFailed() sends exactly the one failed item
  ok  the retried item left the failed state
  ok  retryFailed() with nothing failed does not call the executor
  ok  undo(id) inside the window returns that item to needs_approval
  ok  items left in the window become success when it expires
  ok  addItems() takes a list while nothing is executing
  ok  reset() restores the initial items and drops everything else
  ok  destroy() is safe once everything has settled

store-check: 18 checks passed
```

It runs on plain `node` with no test runner and no DOM. If you can run that, the library works in
your runtime.

---

## The ten use cases

| #   | Use case                       | `canSelect` | `canEdit` | `canUndo` | `undoMs` | What it exercises                                                                       |
| --- | ------------------------------ | ----------- | --------- | --------- | -------- | --------------------------------------------------------------------------------------- |
| 01  | Support replies                | ✅          | ✅        | ✅        | 5000     | Edit-before-send, one mailbox 429s alone, and a new ticket arrives mid-flight (queue)     |
| 02  | Refunds and payments           | ✅          | ❌        | ✅        | 30000    | The money preset: amounts are not editable, the recall window is long because it is money |
| 03  | Multi-platform publishing      | ✅          | ✅        | ✅        | 5000     | Editable copy per platform, a 422 on one platform, a mirror post queued behind the batch |
| 04  | Meeting scheduling             | ✅          | ✅        | ✅        | 5000     | Nothing books until a human picks a slot — the edit *is* the approval                     |
| 05  | Account cancellations          | ✅          | ❌        | ❌        | —        | The action preset with the flags off: irreversible, so only a deliberate yes              |
| 06  | CI/CD deploy approvals         | ✅          | ❌        | ❌        | —        | No undo window, and a failed smoke test lands on one deployment, not the batch            |
| 07  | GDPR deletion requests         | ✅          | ❌        | ❌        | —        | Cannot be recalled or rewritten; every record keeps an identity reference                 |
| 08  | Purchase orders                | ✅          | ✅        | ✅        | 30000    | Correct the amount, long window, and an approval threshold that rejects one order         |
| 09  | Contract signing               | ✅          | ❌        | ❌        | —        | Final on both counts: no undo, no edit                                                    |
| 10  | Ad campaign launches           | ✅          | ✅        | ✅        | 30000    | Edit the daily budget, a spend-limit failure, and a new campaign arriving while launching |

All ten run against the same five presets the package ships (`sendApproval`, `actionApproval`,
`scheduleApproval`, `paymentApproval`, `publishApproval`) — they are plain data, so they are spread
straight into the store config.

---

## How to use `agent-approval-machine` in Vue

### 1. Install

```bash
npm install agent-approval-machine
```

> Installed from npm: `"agent-approval-machine": "^0.1.0"`. The published package is a few kB, so
> `npm install` is quick.

### 2. Create the store

The package is headless, so the store has no idea Vue exists. Give it items, the flags, and an
executor that talks to your real provider:

```ts
import { createApprovalStore } from "agent-approval-machine";

const store = createApprovalStore({
  items: rows,                 // [{ id, ... }, ...]
  canUndo: true,
  undoMs: 5000,
  canEdit: true,
  canSelect: true,
  onExecute: async (batch) => {
    const res = await fetch("/api/send", { method: "POST", body: JSON.stringify(batch) });
    const { succeeded, failed } = await res.json();
    return { succeeded, failed };   // partial failure is first class
  },
});
```

### 3. Subscribe with `shallowRef`

`src/approval-store.ts` — this is the **whole** binding:

```ts
import { onScopeDispose, shallowRef } from "vue";
import { createApprovalStore } from "agent-approval-machine";

export function useApprovalStore(config) {
  const store = createApprovalStore(config);
  const snapshot = shallowRef(store.getSnapshot());

  const unsubscribe = store.subscribe(() => {
    snapshot.value = store.getSnapshot();
  });

  onScopeDispose(() => {
    unsubscribe();
    store.destroy();   // cancels pending undo timers
  });

  return { store, snapshot };
}
```

Two details worth knowing:

- **`shallowRef`, not `ref`.** `getSnapshot()` is already referentially stable — it returns the same
  object until something actually changes — so deep reactivity would be pure overhead. You only ever
  need to know *when* it was replaced, which is exactly what `shallowRef` tracks.
- **`onScopeDispose`, not `onUnmounted`.** The store owns real timers (one per item in its undo
  window). Disposing on scope teardown means those timers are cancelled when the component goes
  away, and the helper still works if you ever call it outside a component.

### 4. Render

`snapshot` is a ref, so the template unwraps it:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useApprovalStore } from "./approval-store";

const { store, snapshot } = useApprovalStore({ items, canUndo: true, onExecute: send });
const summary = computed(() => snapshot.value.summary);
</script>

<template>
  <button :disabled="summary.needsApproval + summary.editing === 0" @click="store.approve()">
    Approve all open ({{ summary.needsApproval + summary.editing }})
  </button>

  <ul>
    <li v-for="record in snapshot.itemsWithState" :key="record.item.id" :class="record.status">
      <input
        type="checkbox"
        :checked="snapshot.selectedIds.includes(record.item.id)"
        @change="store.select(record.item.id)"
      />
      <span>{{ record.item.title }}</span>

      <!-- edit before approve: the payload onExecute receives -->
      <textarea
        v-if="record.status === 'needs_approval' || record.status === 'editing'"
        :value="record.item.body"
        @input="store.edit(record.item.id, { body: ($event.target as HTMLTextAreaElement).value })"
      />

      <em v-if="record.error">{{ record.error }}</em>
      <span>{{ record.status }}</span>
      <button v-if="record.status === 'undoing'" @click="store.undo(record.item.id)">Recall</button>
    </li>
  </ul>

  <button v-if="summary.failed" @click="store.retryFailed()">Retry {{ summary.failed }} failed</button>
</template>
```

### 5. Dispose

`useApprovalStore` already does it. If you wire the store up by hand instead, call `store.destroy()`
on unmount (or `unsubscribe()` at minimum) so the undo timers do not outlive the view.

### The verbs, in one place

```ts
store.select(id);                                // toggle one
store.selectAll();                               // toggle all open
store.edit(id, { body: "…" });                    // mark edited; this is what the executor gets
await store.approve(ids?);                        // { succeeded, failed }
store.deny(ids?);                                 // dismiss (removed + remembered)
store.undo(id?);                                  // recall inside the undo window
await store.retryFailed();                        // re-execute only the failed items
store.addItems(items);                            // queued automatically if something is executing
store.clearQueue();
store.reset(items?);
store.setConfig({ canUndo, undoMs, canEdit, canSelect, onExecute, onUndo });
store.syncItems(items);                           // reconcile against your source of truth
store.destroy();
```

---

## File layout

```
agent-approval-machine-demo-vue/
├── index.html                     # Vite entry (mounts #app)
├── package.json                   # the store pins to the local 0.1.0 tarball
├── tsconfig.json
├── vite.config.ts                 # plugin-vue only — no vite-plugin-vuetify
├── scripts/
│   ├── store-check.mjs            # headless proof that the store works (no DOM)
│   └── render-check.mjs           # SSR render of App.vue + markup assertions
└── src/
    ├── main.ts                    # createApp(App).use(vuetify).mount("#app")
    ├── vuetify.ts                 # explicit component registration + dark theme
    ├── approval-store.ts          # ⬅ the entire Vue binding: useApprovalStore()
    ├── use-cases.ts               # the ten flows: items, flags, fail map, arrival timing
    ├── styles.css                 # the shared visual language (dark, monospace metadata)
    ├── App.vue                    # page shell + IntersectionObserver scroll-spy
    └── components/
        ├── TopBar.vue             # sticky nav
        ├── SectionSidebar.vue     # sticky list of the ten sections
        └── UseCaseSection.vue     # one store per section: toolbar, rows, queue banner
```

`src/approval-store.ts` is the file to read if you only read one. `src/use-cases.ts` is the file to
diff against the other two demos if you want to confirm they render the same content.

### A note on Vuetify

There is no `vite-plugin-vuetify` here on purpose. `src/vuetify.ts` imports the handful of components
this page uses (`VApp`, `VBtn`, `VChip`, `VCheckboxBtn`, `VProgressLinear`, `VTextarea`,
`VTextField`) and hands them to `createVuetify({ components })`, alongside the same dark palette the
vanilla demo uses. One plugin (`@vitejs/plugin-vue`), no transform magic, nothing to misconfigure.

---

## Links

- **npm** — <https://www.npmjs.com/package/agent-approval-machine>
- **GitHub** — <https://github.com/mzubairhassan18/agent-approval-machine>
- **Vanilla / GitHub Pages demo** — <https://mzubairhassan18.github.io/agent-approval-machine/>
- **React / Next.js demo** — <https://github.com/mzubairhassan18/agent-approval-machine-demo-nextjs>
- **Angular demo** — <https://github.com/mzubairhassan18/agent-approval-machine-demo-angular>

MIT · zero dependencies · no peer dependencies.
