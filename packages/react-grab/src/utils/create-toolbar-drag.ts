import { createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { Position } from "../types.js";
import type { SnapEdge } from "../components/toolbar/state.js";
import { TOOLBAR_DRAG_THRESHOLD_PX, TOOLBAR_SNAP_ANIMATION_DURATION_MS } from "../constants.js";
import { nativeRequestAnimationFrame } from "./native-raf.js";
import {
  getRatioFromPosition,
  getPositionFromEdgeAndRatio,
  getSnapPosition,
} from "./toolbar-position.js";

interface ToolbarDragConfig {
  getContainerRef: () => HTMLDivElement | undefined;
  isCollapsed: Accessor<boolean>;
  getExpandedDimensions: () => { width: number; height: number };
  onDragStart: () => void;
  onPositionUpdate: (position: Position) => void;
  onSnapEdgeChange: (edge: SnapEdge, ratio: number) => void;
  onSnapComplete: (result: {
    edge: SnapEdge;
    ratio: number;
    position: Position;
    expandedDimensions: { width: number; height: number };
  }) => void;
  onSnapAnimationEnd?: () => void;
}

interface ToolbarDragResult {
  isDragging: Accessor<boolean>;
  isSnapping: Accessor<boolean>;
  handlePointerDown: (event: PointerEvent) => void;
  createDragAwareHandler: (callback: () => void) => (event: MouseEvent) => void;
}

export const createToolbarDrag = (config: ToolbarDragConfig): ToolbarDragResult => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [isSnapping, setIsSnapping] = createSignal(false);
  const [hasDragMoved, setHasDragMoved] = createSignal(false);
  const [velocity, setVelocity] = createSignal<Position>({ x: 0, y: 0 });
  let dragOffset: Position = { x: 0, y: 0 };

  let lastPointerPosition = { x: 0, y: 0, time: 0 };
  let pointerStartPosition = { x: 0, y: 0 };
  let didDragOccur = false;
  let snapAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let dragAbortController: AbortController | null = null;

  const teardownDragListeners = () => {
    dragAbortController?.abort();
    dragAbortController = null;
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    if (!hasDragMoved()) {
      const distanceMoved = Math.hypot(
        event.clientX - pointerStartPosition.x,
        event.clientY - pointerStartPosition.y,
      );
      if (distanceMoved <= TOOLBAR_DRAG_THRESHOLD_PX) {
        return;
      }
      setHasDragMoved(true);
      config.onDragStart();
    }

    const now = performance.now();
    const deltaTime = now - lastPointerPosition.time;

    if (deltaTime > 0) {
      const newVelocityX = (event.clientX - lastPointerPosition.x) / deltaTime;
      const newVelocityY = (event.clientY - lastPointerPosition.y) / deltaTime;
      setVelocity({ x: newVelocityX, y: newVelocityY });
    }

    lastPointerPosition = { x: event.clientX, y: event.clientY, time: now };

    const newX = event.clientX - dragOffset.x;
    const newY = event.clientY - dragOffset.y;

    config.onPositionUpdate({ x: newX, y: newY });
  };

  const handleWindowPointerUp = () => {
    teardownDragListeners();

    const didMove = hasDragMoved();
    setIsDragging(false);

    if (!didMove) {
      return;
    }

    didDragOccur = true;

    const containerRef = config.getContainerRef();
    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    const currentVelocity = velocity();
    const snap = getSnapPosition(
      rect.left,
      rect.top,
      rect.width,
      rect.height,
      currentVelocity.x,
      currentVelocity.y,
    );
    const ratio = getRatioFromPosition(snap.edge, snap.x, snap.y, rect.width, rect.height);

    config.onSnapEdgeChange(snap.edge, ratio);
    setIsSnapping(true);

    // Two nested rAFs are needed because an edge change may switch the toolbar
    // orientation (horizontal to vertical), altering its dimensions. The first
    // frame waits for the DOM update and the second for layout to settle so
    // getBoundingClientRect returns the post-transition size.
    nativeRequestAnimationFrame(() => {
      const postRenderRect = containerRef?.getBoundingClientRect();
      const updatedDimensions = postRenderRect
        ? { width: postRenderRect.width, height: postRenderRect.height }
        : config.getExpandedDimensions();

      nativeRequestAnimationFrame(() => {
        const snappedPosition = getPositionFromEdgeAndRatio(
          snap.edge,
          ratio,
          updatedDimensions.width,
          updatedDimensions.height,
        );

        config.onSnapComplete({
          edge: snap.edge,
          ratio,
          position: snappedPosition,
          expandedDimensions: updatedDimensions,
        });

        snapAnimationTimeout = setTimeout(() => {
          setIsSnapping(false);
          config.onSnapAnimationEnd?.();
        }, TOOLBAR_SNAP_ANIMATION_DURATION_MS);
      });
    });
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (config.isCollapsed()) return;

    const containerRef = config.getContainerRef();
    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    pointerStartPosition = { x: event.clientX, y: event.clientY };

    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setIsDragging(true);
    setHasDragMoved(false);
    setVelocity({ x: 0, y: 0 });
    lastPointerPosition = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };

    teardownDragListeners();
    dragAbortController = new AbortController();
    const { signal } = dragAbortController;
    window.addEventListener("pointermove", handleWindowPointerMove, { signal });
    window.addEventListener("pointerup", handleWindowPointerUp, { signal });
    window.addEventListener("pointercancel", handleWindowPointerUp, { signal });
  };

  const createDragAwareHandler = (callback: () => void) => (event: MouseEvent) => {
    event.stopImmediatePropagation();
    if (didDragOccur) {
      didDragOccur = false;
      return;
    }
    callback();
  };

  onCleanup(() => {
    teardownDragListeners();
    clearTimeout(snapAnimationTimeout);
  });

  return {
    isDragging,
    isSnapping,
    handlePointerDown,
    createDragAwareHandler,
  };
};
