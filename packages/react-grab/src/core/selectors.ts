import { type Accessor, createMemo } from "solid-js";
import { DRAG_THRESHOLD_PX } from "../constants.js";
import type { createGrabStore } from "./store.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

/**
 * Pure derivations over the grab state machine. Every selector here is a
 * function of `(store, current, pointer)` only and has no other reactive
 * dependencies. Subsystems (drag, labels, copy, etc.) layer additional
 * cross-cutting memos on top of these.
 */
export interface GrabPhaseSelectors {
  isHoldingKeys: Accessor<boolean>;
  isActivated: Accessor<boolean>;
  isFrozenPhase: Accessor<boolean>;
  isDragging: Accessor<boolean>;
  /**
   * True only when the drag has actually moved beyond the click threshold.
   * Used for selection-visibility decisions so a click (which momentarily
   * enters the dragging-select phase between pointerdown and pointerup)
   * does not flash the selection bounds off and back on.
   */
  isActivelyDragging: Accessor<boolean>;
  isDragRepositioning: Accessor<boolean>;
  didJustDrag: Accessor<boolean>;
  isCopying: Accessor<boolean>;
  isSelectionInteractionLocked: Accessor<boolean>;
  didJustCopy: Accessor<boolean>;
  isPromptMode: Accessor<boolean>;
  isCommentMode: Accessor<boolean>;
  isPendingDismiss: Accessor<boolean>;
}

export const createGrabPhaseSelectors = (grab: GrabStoreHandle): GrabPhaseSelectors => {
  const { store, current, pointer } = grab;

  const isHoldingKeys = createMemo(() => current().state === "holding");
  const isActivated = createMemo(() => current().state === "active");
  const isFrozenPhase = createMemo(() => {
    const currentState = current();
    return currentState.state === "active" && currentState.phase === "frozen";
  });
  const isDragging = createMemo(() => {
    const currentState = current();
    return (
      currentState.state === "active" &&
      (currentState.phase === "dragging-select" || currentState.phase === "dragging-reposition")
    );
  });
  const isActivelyDragging = createMemo(() => {
    if (!isDragging()) return false;
    const deltaX = Math.abs(pointer().x + window.scrollX - store.dragStart.x);
    const deltaY = Math.abs(pointer().y + window.scrollY - store.dragStart.y);
    return deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX;
  });
  const isDragRepositioning = createMemo(() => {
    const currentState = current();
    return currentState.state === "active" && currentState.phase === "dragging-reposition";
  });
  const didJustDrag = createMemo(() => {
    const currentState = current();
    return currentState.state === "active" && currentState.phase === "justDragged";
  });
  const isCopying = createMemo(() => current().state === "copying");
  const isSelectionInteractionLocked = createMemo(() => store.selectionInteractionLockDepth > 0);
  const didJustCopy = createMemo(() => current().state === "justCopied");
  const isPromptMode = createMemo(() => {
    const currentState = current();
    return currentState.state === "active" && Boolean(currentState.isPromptMode);
  });
  const isCommentMode = createMemo(() => store.pendingCommentMode || isPromptMode());
  const isPendingDismiss = createMemo(() => {
    const currentState = current();
    return (
      currentState.state === "active" &&
      Boolean(currentState.isPromptMode) &&
      Boolean(currentState.isPendingDismiss)
    );
  });

  return {
    isHoldingKeys,
    isActivated,
    isFrozenPhase,
    isDragging,
    isActivelyDragging,
    isDragRepositioning,
    didJustDrag,
    isCopying,
    isSelectionInteractionLocked,
    didJustCopy,
    isPromptMode,
    isCommentMode,
    isPendingDismiss,
  };
};
