import { type Accessor, createSignal } from "solid-js";

export interface ShiftMultiSelectState {
  /** Reactive accessor for whether shift-multi-select is in progress. */
  isActive: Accessor<boolean>;
  /** Direct setter for the active flag. */
  setActive: (value: boolean) => void;
  /** End shift-multi-select: clear the flag + drop all per-element anchors. */
  stop: () => void;
  /** Per-element label-cursor anchor ratio (0..1) set when an element joined the selection. */
  getAnchorRatio: (element: Element) => number | undefined;
  /** Record the cursor anchor ratio for an element joining the selection. */
  setAnchorRatio: (element: Element, ratio: number) => void;
  /** Drop the anchor for an element leaving the selection. */
  deleteAnchor: (element: Element) => void;
}

/**
 * Tracks the shift-multi-select gesture state across the drag handlers and
 * the renderer-visible derivations (frozen-label-entry mouseX, pending-shift
 * preview, etc.). Owns the WeakMap of per-element label-cursor anchor
 * ratios; the WeakMap is replaced (not just cleared) on `stop()` so any
 * remaining references in flight observe a fresh blank state.
 */
export const createShiftMultiSelectState = (): ShiftMultiSelectState => {
  const [isActive, setActive] = createSignal(false);
  let anchorRatios = new WeakMap<Element, number>();

  return {
    isActive,
    setActive,
    stop: () => {
      setActive(false);
      anchorRatios = new WeakMap<Element, number>();
    },
    getAnchorRatio: (element) => anchorRatios.get(element),
    setAnchorRatio: (element, ratio) => {
      anchorRatios.set(element, ratio);
    },
    deleteAnchor: (element) => {
      anchorRatios.delete(element);
    },
  };
};
