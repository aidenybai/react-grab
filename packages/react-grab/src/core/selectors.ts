import { type Accessor, createMemo, mapArray } from "solid-js";
import { DRAG_THRESHOLD_PX } from "../constants.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
} from "../utils/create-bounds-from-drag-rect.js";
import { combineBounds } from "../utils/combine-bounds.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { isRootElement } from "../utils/is-root-element.js";
import type { OverlayBounds } from "../types.js";
import type { GrabStoreHandle } from "./store.js";


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
  /** True while the context menu is open (regardless of which element it targets). */
  isContextMenuOpen: Accessor<boolean>;
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
  const isContextMenuOpen = createMemo(() => store.contextMenuPosition !== null);
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
    isContextMenuOpen,
  };
};

/**
 * Element/bounds derivations that depend on both the store and the
 * pre-computed phase selectors. These are split from phase selectors
 * because element selectors compose phase selectors as inputs.
 */
export interface GrabElementSelectors {
  /** True while the renderer is showing the selection UI (active and not mid-copy). */
  isRendererActive: Accessor<boolean>;
  /** Live detected element under the pointer, gated by visibility rules. */
  targetElement: Accessor<Element | null>;
  /** Frozen element if any, else the live target while not in frozen phase. */
  effectiveElement: Accessor<Element | null>;
  /** Effective element with touch-mode + drag fallbacks; undefined for root nodes. */
  selectionElement: Accessor<Element | undefined>;
  /** Memoized bounds for each frozen element, viewport-aware. */
  frozenElementsBounds: Accessor<OverlayBounds[]>;
  /** Selection bounds for the current selection (single, multi, or drag-rect-derived). */
  selectionBounds: Accessor<OverlayBounds | undefined>;
  /** Synchronous read of whether the selection element should be drawn now. */
  isSelectionElementVisible: () => boolean;
}

export const createGrabElementSelectors = (
  grab: GrabStoreHandle,
  phase: GrabPhaseSelectors,
): GrabElementSelectors => {
  const { store, viewportVersion } = grab;
  const { isActivated, isCopying, isActivelyDragging, isSelectionInteractionLocked, isDragging, isFrozenPhase } = phase;

  const isRendererActive = createMemo(() => isActivated() && !isCopying());

  const targetElement = createMemo(() => {
    void viewportVersion();
    if (!isRendererActive() || isActivelyDragging() || isSelectionInteractionLocked()) {
      return null;
    }
    const element = store.detectedElement;
    if (!isElementConnected(element)) return null;
    return element;
  });

  const effectiveElement = createMemo(
    () => store.frozenElement || (isFrozenPhase() ? null : targetElement()),
  );

  // In touch mode during a drag, effectiveElement() is null because pointer
  // events are captured by the drag handler. We fall back to detectedElement,
  // which was stored before the drag started.
  const getSelectionElement = (): Element | undefined => {
    if (store.isTouchMode && isDragging()) {
      const detected = store.detectedElement;
      if (!detected || isRootElement(detected)) return undefined;
      return detected;
    }
    const element = effectiveElement();
    if (!element || isRootElement(element)) return undefined;
    return element;
  };

  const selectionElement = createMemo(() => getSelectionElement());

  const isSelectionElementVisible = (): boolean => {
    const element = selectionElement();
    if (!element) return false;
    if (store.isTouchMode && isDragging()) {
      return isRendererActive();
    }
    return isRendererActive() && !isActivelyDragging();
  };

  const frozenElementBoundsAccessors = mapArray(
    () => store.frozenElements,
    (element) =>
      createMemo(() => {
        void viewportVersion();
        return createElementBounds(element);
      }),
  );

  const frozenElementsBounds = createMemo((): OverlayBounds[] => {
    const frozenElements = store.frozenElements;
    if (frozenElements.length === 0) return [];

    const dragRect = store.frozenDragRect;
    if (dragRect && frozenElements.length > 1) {
      return [createBoundsFromDragRect(dragRect)];
    }

    return frozenElementBoundsAccessors().map((readBounds) => readBounds());
  });

  const selectionBounds = createMemo((): OverlayBounds | undefined => {
    void viewportVersion();

    const frozenElements = store.frozenElements;
    if (frozenElements.length > 0) {
      const frozenBounds = frozenElementsBounds();
      if (frozenElements.length === 1) {
        const firstBounds = frozenBounds[0];
        if (firstBounds) return firstBounds;
      }
      const dragRect = store.frozenDragRect;
      if (dragRect) {
        const dragBounds = frozenBounds[0];
        return dragBounds ?? createBoundsFromDragRect(dragRect);
      }
      return createFlatOverlayBounds(combineBounds(frozenBounds));
    }

    const element = selectionElement();
    if (!element) return undefined;
    return createElementBounds(element);
  });

  return {
    isRendererActive,
    targetElement,
    effectiveElement,
    selectionElement,
    frozenElementsBounds,
    selectionBounds,
    isSelectionElementVisible,
  };
};
