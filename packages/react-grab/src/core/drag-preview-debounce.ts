import { type Accessor, createSignal } from "solid-js";
import { DRAG_PREVIEW_DEBOUNCE_MS } from "../constants.js";
import type { Position } from "../types.js";

export interface DragPreviewDebounce {
  /** Most recent pointer position after the debounce settles, or null while debouncing. */
  pointer: Accessor<Position | null>;
  /** Schedule a debounced update; cancels any prior pending update. */
  schedule: (clientX: number, clientY: number) => void;
  /** Clear the debounce and null out the pointer immediately. */
  cancel: () => void;
}

/**
 * Debounces drag-preview pointer updates so the per-frame
 * `getElementsInDrag` traversal isn't re-run on every pointermove.
 * `dragPreviewBounds` consumers read `pointer()` to know the latest stable
 * coordinate; while a fresh schedule is pending it returns null so the
 * preview hides between adjustments.
 */
export const createDragPreviewDebounce = (): DragPreviewDebounce => {
  const [pointer, setPointer] = createSignal<Position | null>(null);
  let timerId: number | null = null;

  const cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    setPointer(null);
  };

  const schedule = (clientX: number, clientY: number) => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    setPointer(null);
    timerId = window.setTimeout(() => {
      setPointer({ x: clientX, y: clientY });
      timerId = null;
    }, DRAG_PREVIEW_DEBOUNCE_MS);
  };

  return { pointer, schedule, cancel };
};
