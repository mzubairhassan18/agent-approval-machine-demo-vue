/**
 * The entire Vue binding for `agent-approval-machine`.
 *
 * The package is headless: it owns state and hands you a snapshot. Vue needs a
 * component to re-render when that snapshot changes, so we keep it in a
 * `shallowRef` and swap the reference in a subscriber. `shallowRef` (not `ref`)
 * because the snapshot is already immutable-ish and referentially stable until
 * something actually changes — deep proxying it would be wasted work.
 *
 * This file is the whole glue. It is ~10 lines of logic, not a library.
 */
import { onScopeDispose, shallowRef } from "vue";
import type { ShallowRef } from "vue";
import { createApprovalStore } from "agent-approval-machine";
import type { ApprovalSnapshot, ApprovalStore, UseApprovalConfig } from "agent-approval-machine";

export interface UseApprovalStoreResult<T extends { id: string }> {
  /** The raw store: every verb (`select`, `edit`, `approve`, `undo`, …). */
  store: ApprovalStore<T>;
  /** Reactive snapshot. Read `snapshot.value` in script, `snapshot` in template. */
  snapshot: ShallowRef<ApprovalSnapshot<T>>;
}

export function useApprovalStore<T extends { id: string }>(
  config: UseApprovalConfig<T>,
): UseApprovalStoreResult<T> {
  const store = createApprovalStore(config);
  const snapshot = shallowRef(store.getSnapshot());

  // One subscriber, one assignment. The store does the derivation.
  const unsubscribe = store.subscribe(() => {
    snapshot.value = store.getSnapshot();
  });

  // `onScopeDispose` fires when the component unmounts (or the effect scope
  // stops), so the store's pending undo timers never outlive the view.
  onScopeDispose(() => {
    unsubscribe();
    store.destroy();
  });

  return { store, snapshot };
}
