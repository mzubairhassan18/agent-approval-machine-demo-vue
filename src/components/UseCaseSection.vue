<script setup lang="ts">
/**
 * One use case = one `createApprovalStore` instance + one section of DOM.
 *
 * The store is created through the `useApprovalStore` composable, which is the
 * only Vue-specific code in the whole app. Everything below the toolbar is
 * plain rendering of `snapshot.value`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ApprovalRecord, ApprovalResult } from "agent-approval-machine";

import { useApprovalStore } from "../approval-store";
import { isOpenStatus, money, STATUS_LABEL } from "../use-cases";
import type { UseCase, UseCaseEdit, UseCaseItem } from "../use-cases";

const props = defineProps<{ useCase: UseCase; index: number }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Tracks the one-time arrival per section: it is "forgotten" by Reset. */
let arrived = false;

/** Items that already burned their one failing attempt, so a retry recovers. */
const failedOnce = new Set<string>();

/** The fake provider: succeeds for everything the use case does not fail. */
function partition(batch: UseCaseItem[]): ApprovalResult<UseCaseItem> {
  const succeeded: UseCaseItem[] = [];
  const failed: { item: UseCaseItem; error: string }[] = [];
  for (const item of batch) {
    const error = props.useCase.fail?.[item.id];
    // Like a real provider that rate-limits: the first attempt fails, the retry
    // goes through — which is what the failure messages promise.
    if (error && !failedOnce.has(item.id)) {
      failedOnce.add(item.id);
      failed.push({ item, error });
    } else {
      succeeded.push(item);
    }
  }
  return { succeeded, failed };
}

const { store, snapshot } = useApprovalStore<UseCaseItem>({
  items: props.useCase.items.map((item) => ({ ...item })),
  ...props.useCase.flags,
  onExecute: async (batch) => {
    // The first execute of this use case is what a provider would answer with:
    // a brand new item, mid-flight. The store holds it as `queued`.
    if (props.useCase.arrival && !arrived) {
      arrived = true;
      const arrival = props.useCase.arrival;
      setTimeout(() => store.addItems([{ ...arrival.item }]), arrival.after);
    }
    await sleep(700 + batch.length * 260);
    return partition(batch);
  },
  onUndo: async () => {
    await sleep(260);
  },
});

/* ---- derived view ------------------------------------------------------ */

const summary = computed(() => snapshot.value.summary);
const rows = computed(() => snapshot.value.itemsWithState);
const openCount = computed(() => summary.value.needsApproval + summary.value.editing);

const approveLabel = computed(() =>
  summary.value.selected
    ? `Approve selected (${summary.value.selected})`
    : `Approve all open (${openCount.value})`,
);
const retryLabel = computed(() =>
  summary.value.failed ? `Retry ${summary.value.failed} failed` : "Retry failed",
);
const summaryLine = computed(
  () =>
    `${summary.value.needsApproval} open · ${summary.value.editing} edited · ` +
    `${summary.value.executing} sending · ${summary.value.undoing} recallable · ` +
    `${summary.value.failed} failed`,
);

/* ---- edit fields ------------------------------------------------------- */

/**
 * A focus-tracked draft. Vue only writes `value` when the bound value changed,
 * so a re-render (the 150 ms undo tick) cannot clobber what you are typing —
 * and for the number inputs we keep the raw string until blur, which is what
 * stops `"12."` from collapsing to `12` mid-keystroke.
 */
const focusedId = ref<string | null>(null);
const focusedDraft = ref("");

function editPatch(edit: UseCaseEdit, value: string): Partial<UseCaseItem> {
  switch (edit.key) {
    case "amount":
      return { amount: Number(value) };
    case "slot":
      return { slot: value };
    case "body":
      return { body: value };
  }
}

function displayValue(record: ApprovalRecord<UseCaseItem>): string {
  const edit = props.useCase.edit;
  if (!edit) return "";
  if (focusedId.value === record.item.id) return focusedDraft.value;
  const raw = record.item[edit.key];
  return raw == null ? "" : String(raw);
}

function onEditInput(record: ApprovalRecord<UseCaseItem>, value: string) {
  const edit = props.useCase.edit;
  if (!edit) return;
  focusedDraft.value = value;
  store.edit(record.item.id, editPatch(edit, value));
}

/* ---- undo countdown ---------------------------------------------------- */

/**
 * The only clock in the app. `countdownText` reads `now` *after* the early
 * return, so a section that has nothing recallable never re-renders on a tick.
 */
const now = ref(Date.now());
let ticker: number | undefined;

onMounted(() => {
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 150);
});
onBeforeUnmount(() => {
  if (ticker !== undefined) window.clearInterval(ticker);
});

function countdownText(record: ApprovalRecord<UseCaseItem>): string {
  if (record.status !== "undoing" || typeof record.undoDeadline !== "number") return "";
  return `${((record.undoDeadline - now.value) / 1000).toFixed(1)}s`;
}

/* ---- verbs ------------------------------------------------------------- */

function approve() {
  void store.approve();
}
function retry() {
  void store.retryFailed();
}
function reset() {
  arrived = false;
  failedOnce.clear();
  focusedId.value = null;
  focusedDraft.value = "";
  store.reset(props.useCase.items.map((item) => ({ ...item })));
}

function subtitleLine(item: UseCaseItem): string {
  const parts: string[] = [item.subtitle];
  if (item.amount != null) parts.push(money(item.amount));
  if (item.slot) parts.push(`slot: ${item.slot}`);
  return parts.filter(Boolean).join(" · ");
}

const num = computed(() => String(props.index + 1).padStart(2, "0"));
const canSelect = computed(() => props.useCase.flags.canSelect);
const edit = computed(() => props.useCase.edit);
</script>

<template>
  <section :id="useCase.id" class="uc" :class="{ 'is-executing': snapshot.isExecuting }">
    <div class="uc-head">
      <h2>
        <span class="uc-num">{{ num }}</span>{{ useCase.label }}
      </h2>
      <p>{{ useCase.blurb }}</p>
      <div class="flags">
        <v-chip class="flag" :class="useCase.flags.canSelect ? 'on' : 'off'" size="small" label>
          canSelect {{ useCase.flags.canSelect }}
        </v-chip>
        <v-chip class="flag" :class="useCase.flags.canEdit ? 'on' : 'off'" size="small" label>
          canEdit {{ useCase.flags.canEdit }}
        </v-chip>
        <v-chip class="flag" :class="useCase.flags.canUndo ? 'on' : 'off'" size="small" label>
          canUndo {{ useCase.flags.canUndo }}
        </v-chip>
        <v-chip class="flag" :class="useCase.flags.canUndo ? 'on' : 'off'" size="small" label>
          undoMs {{ useCase.flags.undoMs ?? 0 }}
        </v-chip>
      </div>
    </div>

    <div class="toolbar">
      <v-btn
        class="primary-btn"
        variant="flat"
        :disabled="openCount === 0 && summary.failed === 0"
        @click="approve"
      >
        {{ approveLabel }}
      </v-btn>
      <v-btn variant="text" :disabled="summary.selected === 0" @click="store.deny()">
        Deny selected
      </v-btn>
      <v-btn variant="flat" :disabled="summary.failed === 0" @click="retry">
        {{ retryLabel }}
      </v-btn>
      <v-progress-linear
        v-if="snapshot.isExecuting"
        class="exec-bar"
        indeterminate
        color="primary"
        height="4"
        rounded
      />
      <span class="spacer" />
      <span class="pill">{{ summaryLine }}</span>
      <v-btn variant="text" @click="reset">Reset</v-btn>
    </div>

    <div v-if="snapshot.queuedCount > 0" class="queue">
      <span>
        <b>{{ snapshot.queuedCount }} new item{{ snapshot.queuedCount > 1 ? "s" : "" }}</b>
        arrived while a batch was in flight — held as <code>queued</code> and released when it
        settles.
      </span>
      <span class="spacer" />
      <v-btn variant="text" @click="store.clearQueue()">Clear queue</v-btn>
    </div>

    <ul class="rows">
      <li v-for="record in rows" :key="record.item.id" class="row" :class="record.status">
        <div class="row-pick" :class="{ empty: !canSelect }">
          <v-checkbox-btn
            :model-value="snapshot.selectedIds.includes(record.item.id)"
            :disabled="!isOpenStatus(record.status)"
            density="compact"
            hide-details
            color="primary"
            :aria-label="`Select ${record.item.title}`"
            @update:model-value="store.select(record.item.id)"
          />
        </div>

        <div class="row-main">
          <div class="row-title-wrap">
            <span class="row-title">{{ record.item.title }}</span>
            <span v-if="record.item.risk" class="risk" :class="record.item.risk">
              {{ record.item.risk }}
            </span>
          </div>
          <div class="row-sub">{{ subtitleLine(record.item) }}</div>

          <template v-if="edit && isOpenStatus(record.status)">
            <v-textarea
              v-if="edit.kind === 'textarea'"
              class="row-edit"
              variant="outlined"
              density="compact"
              rows="3"
              hide-details
              :aria-label="edit.label"
              :model-value="displayValue(record)"
              @focus="focusedId = record.item.id"
              @blur="focusedId = null"
              @update:model-value="(value: string) => onEditInput(record, value)"
            />
            <v-text-field
              v-else
              class="row-edit"
              variant="outlined"
              density="compact"
              hide-details
              :type="edit.kind === 'number' ? 'number' : 'text'"
              :aria-label="edit.label"
              :model-value="displayValue(record)"
              @focus="focusedId = record.item.id"
              @blur="focusedId = null"
              @update:model-value="(value: string) => onEditInput(record, value)"
            />
          </template>

          <div v-if="record.status === 'editing'" class="edit-hint">
            edited — this is the value <code>onExecute</code> receives
          </div>
          <div v-if="record.error" class="row-error">{{ record.error }}</div>
        </div>

        <div class="row-side">
          <span v-if="countdownText(record)" class="countdown">{{ countdownText(record) }}</span>
          <v-chip class="badge" :class="record.status" size="small" label>
            {{ STATUS_LABEL[record.status] }}
          </v-chip>
          <v-btn
            v-if="record.status === 'undoing'"
            class="recall"
            variant="flat"
            @click="store.undo(record.item.id)"
          >
            Recall
          </v-btn>
        </div>
      </li>
    </ul>
  </section>
</template>
