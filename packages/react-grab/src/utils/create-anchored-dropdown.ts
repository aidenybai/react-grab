import { createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { DropdownAnchor } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ANIMATION_DURATION_MS,
  DROPDOWN_OFFSCREEN_POSITION,
  DROPDOWN_VIEWPORT_PADDING_PX,
} from "../constants.js";
import { getAnchoredDropdownPosition } from "./get-anchored-dropdown-position.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "./native-raf.js";

interface AnchoredDropdownResult {
  shouldMount: Accessor<boolean>;
  isAnimatedIn: Accessor<boolean>;
  lastAnchorEdge: Accessor<DropdownAnchor["edge"]>;
  displayPosition: Accessor<{ left: number; top: number }>;
  measure: () => void;
  clearAnimationHandles: () => void;
}

export const createAnchoredDropdown = (
  containerRef: () => HTMLDivElement | undefined,
  anchorAccessor: Accessor<DropdownAnchor | null>,
): AnchoredDropdownResult => {
  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [shouldMount, setShouldMount] = createSignal(false);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [lastAnchorEdge, setLastAnchorEdge] =
    createSignal<DropdownAnchor["edge"]>("bottom");

  let exitAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let enterAnimationFrameId: number | undefined;

  const clearAnimationHandles = () => {
    clearTimeout(exitAnimationTimeout);
    if (enterAnimationFrameId !== undefined) {
      nativeCancelAnimationFrame(enterAnimationFrameId);
      enterAnimationFrameId = undefined;
    }
  };

  const measure = () => {
    const container = containerRef();
    if (container) {
      setMeasuredWidth(container.offsetWidth);
      setMeasuredHeight(container.offsetHeight);
    }
  };

  const handleViewportChange = () => {
    setViewportVersion(
      (previousViewportVersion) => previousViewportVersion + 1,
    );
    measure();
  };

  createEffect(() => {
    const anchor = anchorAccessor();
    if (anchor) {
      setLastAnchorEdge(anchor.edge);
      clearTimeout(exitAnimationTimeout);
      setShouldMount(true);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      // The rAF waits for layout so dimensions are non-zero. The forced reflow
      // via offsetHeight then commits the computed position before the opacity
      // transition starts, preventing a flash at the offscreen initial position.
      enterAnimationFrameId = nativeRequestAnimationFrame(() => {
        measure();
        void containerRef()?.offsetHeight;
        setIsAnimatedIn(true);
      });
    } else {
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      setIsAnimatedIn(false);
      exitAnimationTimeout = setTimeout(() => {
        setShouldMount(false);
      }, DROPDOWN_ANIMATION_DURATION_MS);
    }
    onCleanup(clearAnimationHandles);
  });

  createEffect(() => {
    const anchor = anchorAccessor();
    if (!anchor) return;

    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    onCleanup(() => {
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportChange,
      );
    });
  });

  const displayPosition = createMemo(
    (previousPosition: { left: number; top: number }) => {
      viewportVersion();
      const position = getAnchoredDropdownPosition({
        anchor: anchorAccessor(),
        measuredWidth: measuredWidth(),
        measuredHeight: measuredHeight(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        anchorGapPx: DROPDOWN_ANCHOR_GAP_PX,
        viewportPaddingPx: DROPDOWN_VIEWPORT_PADDING_PX,
        offscreenPosition: DROPDOWN_OFFSCREEN_POSITION,
      });
      if (position.left !== DROPDOWN_OFFSCREEN_POSITION.left) {
        return position;
      }
      return previousPosition;
    },
    DROPDOWN_OFFSCREEN_POSITION,
  );

  return {
    shouldMount,
    isAnimatedIn,
    lastAnchorEdge,
    displayPosition,
    measure,
    clearAnimationHandles,
  };
};
