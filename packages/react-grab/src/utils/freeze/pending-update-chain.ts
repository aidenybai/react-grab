import type { PendingUpdate } from "./types.js";

/**
 * Merges two React circular pending-update chains into a single chain.
 * React stores hook-queue updates as a circular list where the queue's
 * `.pending` field points at the *last* node and `.pending.next` is the
 * head. When we're paused, dispatches arrive into a buffered chain
 * separate from the chain that was present at pause-time; on resume both
 * must replay in order.
 *
 * Pure function: no shared state.
 */
export const mergePendingChains = (
  original: PendingUpdate | null,
  buffered: PendingUpdate | null,
): PendingUpdate | null => {
  if (!original) return buffered;
  if (!buffered) return original;
  if (!original.next || !buffered.next) return buffered;

  const originalFirst = original.next;
  const bufferedFirst = buffered.next;
  const isOriginalSingle = original === originalFirst;
  const isBufferedSingle = buffered === bufferedFirst;

  if (isOriginalSingle && isBufferedSingle) {
    original.next = buffered;
    buffered.next = original;
  } else if (isOriginalSingle) {
    original.next = bufferedFirst;
    buffered.next = original;
  } else if (isBufferedSingle) {
    buffered.next = originalFirst;
    original.next = buffered;
  } else {
    original.next = bufferedFirst;
    buffered.next = originalFirst;
  }

  return buffered;
};

/**
 * Walks the React circular pending-update chain (starting at `pending.next`,
 * which is the head; `pending` itself is the tail) and returns the list of
 * `action` values in order.
 *
 * Pure function: no shared state.
 */
export const extractActionsFromChain = (pending: PendingUpdate | null): unknown[] => {
  if (!pending) return [];
  const actions: unknown[] = [];
  const first = pending.next;
  if (!first) return [];
  let current: PendingUpdate | null = first;
  do {
    if (current) {
      actions.push(current.action);
      current = current.next;
    }
  } while (current && current !== first);
  return actions;
};
