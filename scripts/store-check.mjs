/**
 * store-check — proves the store works with no DOM, no framework, no bundler.
 *
 * Run with:  npm run store:check
 *
 * It exercises the four things a demo like this one actually depends on:
 * select, edit before approve, partial failure with a targeted retry, and the
 * undo window (both the recall and the expiry).
 */
import assert from "node:assert/strict";
import { createApprovalStore } from "agent-approval-machine";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("store-check: agent-approval-machine (headless, no DOM)\n");

/* ------------------------------------------------------------------ setup */

const initialItems = [
  { id: "a", title: "Alpha", body: "draft a" },
  { id: "b", title: "Bravo", body: "draft b" },
  { id: "c", title: "Charlie", body: "draft c" },
];

/** Every batch the provider was asked to execute, by id. */
const batches = [];

/** Attempt count per item, so the fake provider fails once and then recovers. */
const attempts = new Map();

const store = createApprovalStore({
  items: initialItems.map((item) => ({ ...item })),
  canUndo: true,
  undoMs: 150,
  canEdit: true,
  canSelect: true,
  onExecute: async (batch) => {
    batches.push(batch.map((item) => item.id));
    await sleep(10);
    const succeeded = [];
    const failed = [];
    for (const item of batch) {
      const attempt = (attempts.get(item.id) ?? 0) + 1;
      attempts.set(item.id, attempt);
      // "b" is rejected on the first attempt only — a transient provider error,
      // which is exactly the case retryFailed() exists for.
      if (item.id === "b" && attempt === 1) failed.push({ item, error: "provider rejected b" });
      else succeeded.push(item);
    }
    return { succeeded, failed };
  },
});

const record = (id) => store.getSnapshot().itemsWithState.find((r) => r.item.id === id);

/* -------------------------------------------------------- 1. snapshot shape */

const first = store.getSnapshot();
await check("getSnapshot() is referentially stable until state changes", () => {
  assert.equal(store.getSnapshot(), first);
});

await check("three items start as needs_approval", () => {
  assert.equal(first.summary.total, 3);
  assert.equal(first.summary.needsApproval, 3);
  assert.equal(first.summary.selected, 0);
  assert.equal(first.isExecuting, false);
});

/* ------------------------------------------------------------- 2. selection */

store.select("a");
await check("select(id) adds the id to selectedIds", () => {
  assert.deepEqual(store.getSnapshot().selectedIds, ["a"]);
  assert.equal(store.getSnapshot().summary.selected, 1);
});

store.select("a");
await check("select(id) again toggles it back off", () => {
  assert.deepEqual(store.getSnapshot().selectedIds, []);
});

store.selectAll();
await check("selectAll() picks every open item", () => {
  assert.deepEqual(store.getSnapshot().selectedIds, ["a", "b", "c"]);
});

store.selectAll();
await check("selectAll() again clears the selection", () => {
  assert.deepEqual(store.getSnapshot().selectedIds, []);
});

/* ------------------------------------------------------ 3. edit before approve */

store.edit("a", { body: "rewritten by a human" });
await check("edit() flips the item to editing and marks it edited", () => {
  assert.equal(record("a").status, "editing");
  assert.equal(record("a").edited, true);
  assert.equal(record("a").item.body, "rewritten by a human");
  assert.equal(record("a").original.body, "draft a");
  assert.equal(store.getSnapshot().summary.editing, 1);
});

/* -------------------------------------------- 4. approve: 2 succeed, 1 fails */

const result = await store.approve();
await check("approve() reports 2 succeeded and 1 failed", () => {
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].item.id, "b");
  assert.equal(result.failed[0].error, "provider rejected b");
});

await check("the executor received the edited payload", () => {
  assert.deepEqual(batches, [["a", "b", "c"]]);
  assert.equal(result.succeeded.find((item) => item.id === "a").body, "rewritten by a human");
});

await check("successes sit in the undo window, the failure carries its error", () => {
  const snap = store.getSnapshot();
  assert.equal(snap.summary.undoing, 2);
  assert.equal(snap.summary.needsApproval, 0);
  assert.equal(snap.summary.failed, 1);
  assert.equal(snap.isExecuting, false);
  assert.equal(typeof record("a").undoDeadline, "number");
  assert.equal(record("b").error, "provider rejected b");
  assert.equal(snap.canUndoUntil, record("a").undoDeadline);
});

/* ------------------------------------- 5. retryFailed retries only the failure */

const retry = await store.retryFailed();
await check("retryFailed() sends exactly the one failed item", () => {
  assert.deepEqual(batches[1], ["b"]);
  assert.equal(retry.succeeded.length, 1);
  assert.equal(retry.succeeded[0].id, "b");
  assert.equal(retry.failed.length, 0);
});

await check("the retried item left the failed state", () => {
  assert.equal(store.getSnapshot().summary.failed, 0);
  assert.equal(record("b").status, "undoing");
  assert.equal(record("b").error, undefined);
});

await check("retryFailed() with nothing failed does not call the executor", async () => {
  const calls = batches.length;
  const empty = await store.retryFailed();
  assert.equal(batches.length, calls);
  assert.deepEqual(empty, { succeeded: [], failed: [] });
});

/* -------------------------------------------------------- 6. the undo window */

store.undo("a");
await check("undo(id) inside the window returns that item to needs_approval", () => {
  assert.equal(record("a").status, "needs_approval");
  assert.equal(record("a").undoDeadline, undefined);
  assert.equal(store.getSnapshot().summary.undoing, 2); // b and c are still in flight
});

await sleep(320);
await check("items left in the window become success when it expires", () => {
  assert.equal(record("b").status, "success");
  assert.equal(record("c").status, "success");
  assert.equal(record("b").undoDeadline, undefined);
  assert.equal(store.getSnapshot().summary.undoing, 0);
  assert.equal(store.getSnapshot().summary.success, 2);
  assert.equal(store.getSnapshot().canUndoUntil, null);
});

/* ------------------------------------------------------- 7. addItems + reset */

await check("addItems() takes a list while nothing is executing", () => {
  store.addItems([{ id: "d", title: "Delta", body: "draft d" }]);
  const snap = store.getSnapshot();
  assert.equal(snap.summary.total, 4);
  assert.equal(snap.summary.needsApproval, 2); // a (recalled) + d
  assert.equal(snap.queuedCount, 0);
});

await check("reset() restores the initial items and drops everything else", () => {
  store.reset(initialItems.map((item) => ({ ...item })));
  const snap = store.getSnapshot();
  assert.equal(snap.summary.total, 3);
  assert.equal(snap.summary.needsApproval, 3);
  assert.equal(record("d"), undefined);
  assert.equal(record("a").item.body, "draft a");
  assert.equal(record("a").status, "needs_approval");
});

store.destroy();
await check("destroy() is safe once everything has settled", () => {
  assert.equal(store.getSnapshot().summary.total, 3);
});

console.log(`\nstore-check: ${passed} checks passed\n`);
