import { type Accessor, createMemo, mapArray } from "solid-js";
import { DRAG_THRESHOLD_PX } from "../constants.js";
import { createFlatOverlayBounds } from "../utils/create-bounds-from-drag-rect.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { getElementsInDrag } from "../utils/get-elements-in-drag.js";
import { getTagName } from "../utils/get-tag-name.js";
import { getComponentDisplayName } from "./context.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { isRootElement } from "../utils/is-root-element.js";
import { isValidGrabbableElement } from "../utils/is-valid-grabbable-element.js";
import { calculateDragDistance, calculateDragRectangle } from "../utils/drag-geometry.js";
import type { FrozenLabelEntry, OverlayBounds, Position } from "../types.js";
import type { ShiftMultiSelectState } from "./shift-multi-select-state.js";
import type { GrabStoreHandle } from "./store.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";


interface DragSelectorsInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  shiftMultiSelect: ShiftMultiSelectState;
  debouncedDragPointer: Accessor<{ x: number; y: number } | null>;
}

export interface DragSelectors {
  pendingShiftSelectionElement: Accessor<Element | null>;
  pendingShiftSelectionBounds: Accessor<OverlayBounds | undefined>;
  isDraggingBeyondThreshold: Accessor<boolean>;
  dragBounds: Accessor<OverlayBounds | undefined>;
  dragPreviewBounds: Accessor<OverlayBounds[]>;
  /** Effective multi-bounds for the renderer: preview > pending+frozen > frozen. */
  selectionBoundsMultiple: Accessor<OverlayBounds[]>;
  /** Per-frozen-element label entries (used when >1 element is frozen). */
  frozenLabelEntries: Accessor<FrozenLabelEntry[]>;
  /** Preview entry for the about-to-be-shift-added element. */
  pendingShiftPreviewEntry: Accessor<FrozenLabelEntry | null>;
  /** Pointer or copy-anchored position used to place the cursor-following label. */
  cursorPosition: Accessor<Position>;
  /** mouseX override for the label of a single shift-multi-select element. */
  shiftSelectionLabelMouseX: Accessor<number | undefined>;
}

/**
 * The cluster of viewport-aware derivations that drive the overlay's drag /
 * shift-multi-select / cursor-anchored label visuals. Kept together because
 * they share the same viewport-version tracking pattern (`void viewportVersion()`),
 * the same element-connectedness guard, and the same dependencies on the
 * frozen elements + drag preview + shift state.
 */
export const createDragSelectors = (input: DragSelectorsInput): DragSelectors => {
  const {
    grab,
    phase,
    elementSelectors,
    shiftMultiSelect,
    debouncedDragPointer,
  } = input;
  const { store, pointer, viewportVersion } = grab;
  const { isCopying, isPromptMode, isDragging } = phase;
  const { frozenElementsBounds, targetElement } = elementSelectors;

  const pendingShiftSelectionElement = createMemo((): Element | null => {
    if (!shiftMultiSelect.isActive()) return null;
    if (store.activationIntent.kind !== "default") return null;

    const element = store.detectedElement;
    if (!isElementConnected(element)) return null;
    if (isRootElement(element)) return null;
    if (store.frozenElements.includes(element)) return null;

    return element;
  });

  const pendingShiftSelectionBounds = createMemo((): OverlayBounds | undefined => {
    void viewportVersion();
    const element = pendingShiftSelectionElement();
    if (!element) return undefined;
    return createElementBounds(element);
  });

  const isDraggingBeyondThreshold = createMemo(() => {
    if (!isDragging()) return false;
    const dragDistance = calculateDragDistance(store.dragStart, pointer().x, pointer().y);
    return dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX;
  });

  const dragBounds = createMemo((): OverlayBounds | undefined => {
    void viewportVersion();
    if (!isDraggingBeyondThreshold()) return undefined;
    const drag = calculateDragRectangle(store.dragStart, pointer().x, pointer().y);
    return createFlatOverlayBounds(drag);
  });

  const dragPreviewBounds = createMemo((): OverlayBounds[] => {
    void viewportVersion();
    if (!isDraggingBeyondThreshold()) return [];

    const debouncedPointer = debouncedDragPointer();
    if (!debouncedPointer) return [];

    const drag = calculateDragRectangle(store.dragStart, debouncedPointer.x, debouncedPointer.y);
    const elements = getElementsInDrag(drag, isValidGrabbableElement);
    const previewElements =
      elements.length > 0 ? elements : getElementsInDrag(drag, isValidGrabbableElement, false);

    return previewElements.map((element) => createElementBounds(element));
  });

  const selectionBoundsMultiple = createMemo((): OverlayBounds[] => {
    const previewBounds = dragPreviewBounds();
    if (previewBounds.length > 0) return previewBounds;

    const pendingBounds = pendingShiftSelectionBounds();
    if (pendingBounds) {
      return [...frozenElementsBounds(), pendingBounds];
    }
    return frozenElementsBounds();
  });

  const frozenLabelEntryAccessors = mapArray(
    () => store.frozenElements,
    (element) => {
      const tagName = getTagName(element) || "element";
      const componentName = getComponentDisplayName(element) ?? undefined;
      return createMemo<FrozenLabelEntry | null>(() => {
        void viewportVersion();
        if (!isElementConnected(element)) return null;
        const bounds = createElementBounds(element);
        const anchorRatio = shiftMultiSelect.getAnchorRatio(element);
        const mouseX =
          anchorRatio === undefined ? undefined : bounds.x + bounds.width * anchorRatio;
        return { tagName, componentName, bounds, mouseX };
      });
    },
  );

  const frozenLabelEntries = createMemo((): FrozenLabelEntry[] => {
    if (isPromptMode() || store.frozenElements.length < 2) return [];
    const entries: FrozenLabelEntry[] = [];
    for (const readEntry of frozenLabelEntryAccessors()) {
      const entry = readEntry();
      if (entry !== null) entries.push(entry);
    }
    return entries;
  });

  const pendingShiftPreviewEntry = createMemo((): FrozenLabelEntry | null => {
    if (isPromptMode()) return null;
    const element = pendingShiftSelectionElement();
    if (!element) return null;
    void viewportVersion();
    const tagName = getTagName(element) || "element";
    const componentName = getComponentDisplayName(element) ?? undefined;
    const bounds = createElementBounds(element);
    return { tagName, componentName, bounds, mouseX: pointer().x };
  });

  const cursorPosition = createMemo<Position>(() => {
    if (isCopying() || isPromptMode()) {
      void viewportVersion();
      const element = store.frozenElement || targetElement();
      if (element) {
        const center = getBoundsCenter(createElementBounds(element));
        return {
          x: center.x + store.copyOffsetFromCenterX,
          y: store.copyStart.y,
        };
      }
      return { x: store.copyStart.x, y: store.copyStart.y };
    }
    return { x: pointer().x, y: pointer().y };
  });

  const shiftSelectionLabelMouseX = createMemo((): number | undefined => {
    if (!shiftMultiSelect.isActive()) return undefined;
    if (store.frozenElements.length !== 1) return undefined;
    void viewportVersion();

    const element = store.frozenElements[0];
    if (!isElementConnected(element)) return undefined;

    const anchorRatio = shiftMultiSelect.getAnchorRatio(element);
    if (anchorRatio === undefined) return undefined;

    const bounds = createElementBounds(element);
    return bounds.x + bounds.width * anchorRatio;
  });

  return {
    pendingShiftSelectionElement,
    pendingShiftSelectionBounds,
    isDraggingBeyondThreshold,
    dragBounds,
    dragPreviewBounds,
    selectionBoundsMultiple,
    frozenLabelEntries,
    pendingShiftPreviewEntry,
    cursorPosition,
    shiftSelectionLabelMouseX,
  };
};
