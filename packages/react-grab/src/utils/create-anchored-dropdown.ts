import { batch, createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import type { DropdownAnchor } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ANIMATION_DURATION_MS,
  DROPDOWN_OFFSCREEN_POSITION,
  DROPDOWN_VIEWPORT_PADDING_PX,
} from "../constants.js";
import { getAnchoredDropdownPosition } from "./get-anchored-dropdown-position.js";
import { getVisualViewport } from "./get-visual-viewport.js";
import { getScopeContainer } from "./runtime-mode.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";

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
  const [lastAnchorEdge, setLastAnchorEdge] = createSignal<DropdownAnchor["edge"]>("bottom");

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
    // Three signal writes — wrap in batch so dependent memos
    // (`displayPosition`) only recompute once per viewport tick
    // instead of three times.
    batch(() => {
      setViewportVersion((previousViewportVersion) => previousViewportVersion + 1);
      measure();
    });
  };

  // The listener effect must NOT re-run on every position update
  // (panel anchor's position object identity changes 60×/sec while
  // the toolbar tracks its bounding rect). Derive a stable
  // "is the dropdown open" memo and key the effect off THAT.
  const isAnchored = createMemo(() => anchorAccessor() !== null);

  createEffect(() => {
    const anchor = anchorAccessor();
    if (anchor) {
      setLastAnchorEdge(anchor.edge);
      clearTimeout(exitAnimationTimeout);
      setShouldMount(true);
      if (enterAnimationFrameId !== undefined) nativeCancelAnimationFrame(enterAnimationFrameId);
      // The rAF waits for layout so dimensions are non-zero. The forced reflow
      // via offsetHeight then commits the computed position before the opacity
      // transition starts, preventing a flash at the offscreen initial position.
      enterAnimationFrameId = nativeRequestAnimationFrame(() => {
        measure();
        void containerRef()?.offsetHeight;
        setIsAnimatedIn(true);
      });
    } else {
      if (enterAnimationFrameId !== undefined) nativeCancelAnimationFrame(enterAnimationFrameId);
      setIsAnimatedIn(false);
      exitAnimationTimeout = setTimeout(() => {
        setShouldMount(false);
      }, DROPDOWN_ANIMATION_DURATION_MS);
    }
    onCleanup(clearAnimationHandles);
  });

  createEffect(() => {
    if (!isAnchored()) return;

    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    // Scoped instances clamp to the container's box, so its resizes must
    // invalidate the position like a window resize does.
    const scopeContainer = getScopeContainer();
    let scopeResizeObserver: ResizeObserver | undefined;
    if (scopeContainer && typeof ResizeObserver !== "undefined") {
      scopeResizeObserver = new ResizeObserver(handleViewportChange);
      scopeResizeObserver.observe(scopeContainer);
    }

    onCleanup(() => {
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      scopeResizeObserver?.disconnect();
    });
  });

  const displayPosition = createMemo((previousPosition: { left: number; top: number }) => {
    viewportVersion();
    // Scope-aware: inside a scoped instance (demo showcases) the container's
    // box is the viewport, so the dropdown stays within the showcase card
    // instead of spilling over the host page.
    const viewport = getVisualViewport();
    const position = getAnchoredDropdownPosition({
      anchor: anchorAccessor(),
      measuredWidth: measuredWidth(),
      measuredHeight: measuredHeight(),
      viewportLeft: viewport.offsetLeft,
      viewportTop: viewport.offsetTop,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      anchorGapPx: DROPDOWN_ANCHOR_GAP_PX,
      viewportPaddingPx: DROPDOWN_VIEWPORT_PADDING_PX,
      offscreenPosition: DROPDOWN_OFFSCREEN_POSITION,
    });
    if (position.left !== DROPDOWN_OFFSCREEN_POSITION.left) {
      return position;
    }
    return previousPosition;
  }, DROPDOWN_OFFSCREEN_POSITION);

  return {
    shouldMount,
    isAnimatedIn,
    lastAnchorEdge,
    displayPosition,
    measure,
    clearAnimationHandles,
  };
};
