import { type Accessor } from "solid-js";
import type { Position } from "../types.js";
import type { createGrabStore } from "./store.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;

interface SpaceDragRepositioningInput {
  grab: GrabStoreHandle;
  isDragging: Accessor<boolean>;
  pointer: Accessor<Position>;
  toPageCoordinates: (clientX: number, clientY: number) => { pageX: number; pageY: number };
}

export interface SpaceDragRepositioning {
  /** True if the keydown event would start/extend space-drag repositioning. */
  isActivationKey: (event: KeyboardEvent) => boolean;
  /** Called from the spacebar keydown handler when a drag is in progress. */
  start: () => void;
  /** Called from the spacebar keyup handler. */
  stop: () => void;
  /**
   * Apply the cumulative scroll delta produced by the auto-scroller to the
   * anchor pointer so the drag rect's reposition delta stays consistent
   * across auto-scrolls. Called from the auto-scroll tick.
   */
  applyScrollDelta: (scrollDelta: Position) => void;
  /**
   * Compute the per-frame reposition delta against the anchor pointer and
   * update the anchor. Called from handlePointerMove while repositioning.
   * Returns the delta to feed into actions.shiftDragStart, or null if no
   * anchor is set yet (the first pointermove after start()).
   */
  applyPointerDelta: (pageX: number, pageY: number) => Position | null;
}

/**
 * The "hold space to drag the drag-rect" subsystem. Owns the anchor pointer
 * position used to compute frame-to-frame reposition deltas.
 */
export const createSpaceDragRepositioning = (
  input: SpaceDragRepositioningInput,
): SpaceDragRepositioning => {
  const { grab, isDragging, pointer, toPageCoordinates } = input;
  const { actions } = grab;
  let anchor: Position | null = null;

  const isActivationKey = (event: KeyboardEvent) =>
    event.code === "Space" || event.key === " ";

  const start = () => {
    if (!isDragging()) return;
    actions.startDragReposition();
    const { pageX, pageY } = toPageCoordinates(pointer().x, pointer().y);
    anchor = { x: pageX, y: pageY };
  };

  const stop = () => {
    actions.stopDragReposition();
    anchor = null;
  };

  const applyScrollDelta = (scrollDelta: Position) => {
    if (anchor) {
      anchor = { x: anchor.x + scrollDelta.x, y: anchor.y + scrollDelta.y };
      return;
    }
    const { pageX, pageY } = toPageCoordinates(pointer().x, pointer().y);
    anchor = { x: pageX, y: pageY };
  };

  const applyPointerDelta = (pageX: number, pageY: number): Position | null => {
    const delta = anchor ? { x: pageX - anchor.x, y: pageY - anchor.y } : null;
    anchor = { x: pageX, y: pageY };
    return delta;
  };

  return { isActivationKey, start, stop, applyScrollDelta, applyPointerDelta };
};
