import { createSignal, onMount, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import { loadToolbarState, saveToolbarState, type SnapEdge } from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { IconCopy } from "../icons/icon-copy.jsx";

interface ToolbarProps {
  isActive?: boolean;
  onToggle?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  commentCount?: number;
  onCopyComments?: () => void;
}

const SNAP_MARGIN = 16;
const MOBILE_BREAKPOINT = 768;
const FADE_IN_DELAY_MS = 500;
const DRAG_THRESHOLD = 5;
const VELOCITY_MULTIPLIER = 150;
const COLLAPSED_WIDTH = 14;
const COLLAPSED_HEIGHT = 14;

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const [isMobile, setIsMobile] = createSignal(
    window.innerWidth < MOBILE_BREAKPOINT,
  );
  const [isVisible, setIsVisible] = createSignal(false);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isSnapping, setIsSnapping] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>("bottom");
  const [positionRatio, setPositionRatio] = createSignal(0.5);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [velocity, setVelocity] = createSignal({ x: 0, y: 0 });
  const [hasDragMoved, setHasDragMoved] = createSignal(false);

  let lastPointerPosition = { x: 0, y: 0, time: 0 };
  let pointerStartPosition = { x: 0, y: 0 };

  const getPositionFromEdgeAndRatio = (
    edge: SnapEdge,
    ratio: number,
    elementWidth: number,
    elementHeight: number,
  ) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minX = SNAP_MARGIN;
    const maxX = Math.max(
      SNAP_MARGIN,
      viewportWidth - elementWidth - SNAP_MARGIN,
    );
    const minY = SNAP_MARGIN;
    const maxY = Math.max(
      SNAP_MARGIN,
      viewportHeight - elementHeight - SNAP_MARGIN,
    );

    if (edge === "top" || edge === "bottom") {
      const availableWidth = Math.max(
        0,
        viewportWidth - elementWidth - SNAP_MARGIN * 2,
      );
      const positionX = Math.min(
        maxX,
        Math.max(minX, SNAP_MARGIN + availableWidth * ratio),
      );
      const positionY = edge === "top" ? minY : maxY;
      return { x: positionX, y: positionY };
    }

    const availableHeight = Math.max(
      0,
      viewportHeight - elementHeight - SNAP_MARGIN * 2,
    );
    const positionY = Math.min(
      maxY,
      Math.max(minY, SNAP_MARGIN + availableHeight * ratio),
    );
    const positionX = edge === "left" ? minX : maxX;
    return { x: positionX, y: positionY };
  };

  const getRatioFromPosition = (
    edge: SnapEdge,
    positionX: number,
    positionY: number,
    elementWidth: number,
    elementHeight: number,
  ) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (edge === "top" || edge === "bottom") {
      const availableWidth = viewportWidth - elementWidth - SNAP_MARGIN * 2;
      if (availableWidth <= 0) return 0.5;
      return Math.max(
        0,
        Math.min(1, (positionX - SNAP_MARGIN) / availableWidth),
      );
    }
    const availableHeight = viewportHeight - elementHeight - SNAP_MARGIN * 2;
    if (availableHeight <= 0) return 0.5;
    return Math.max(
      0,
      Math.min(1, (positionY - SNAP_MARGIN) / availableHeight),
    );
  };

  const recalculatePosition = () => {
    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    const newPosition = getPositionFromEdgeAndRatio(
      snapEdge(),
      positionRatio(),
      rect.width,
      rect.height,
    );
    setPosition(newPosition);
  };

  let didDragOccur = false;

  const createDragAwareHandler =
    (callback: () => void) => (event: MouseEvent) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (didDragOccur) {
        didDragOccur = false;
        return;
      }
      callback();
    };

  const handleToggle = createDragAwareHandler(() => props.onToggle?.());

  const handleToggleCollapse = createDragAwareHandler(() => {
    setIsCollapsed((prev) => {
      const newCollapsed = !prev;
      saveToolbarState({
        edge: snapEdge(),
        ratio: positionRatio(),
        collapsed: newCollapsed,
        enabled: props.enabled ?? true,
      });
      return newCollapsed;
    });
  });

  const handleToggleEnabled = createDragAwareHandler(() =>
    props.onToggleEnabled?.(),
  );

  const handleCopyComments = createDragAwareHandler(() =>
    props.onCopyComments?.(),
  );

  const getSnapPosition = (
    currentX: number,
    currentY: number,
    elementWidth: number,
    elementHeight: number,
    velocityX: number,
    velocityY: number,
  ): { edge: SnapEdge; x: number; y: number } => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const projectedX = currentX + velocityX * VELOCITY_MULTIPLIER;
    const projectedY = currentY + velocityY * VELOCITY_MULTIPLIER;

    const distanceToTop = projectedY + elementHeight / 2;
    const distanceToBottom = viewportHeight - projectedY - elementHeight / 2;
    const distanceToLeft = projectedX + elementWidth / 2;
    const distanceToRight = viewportWidth - projectedX - elementWidth / 2;

    const minDistance = Math.min(
      distanceToTop,
      distanceToBottom,
      distanceToLeft,
      distanceToRight,
    );

    if (minDistance === distanceToTop) {
      return {
        edge: "top",
        x: Math.max(
          SNAP_MARGIN,
          Math.min(projectedX, viewportWidth - elementWidth - SNAP_MARGIN),
        ),
        y: SNAP_MARGIN,
      };
    }
    if (minDistance === distanceToLeft) {
      return {
        edge: "left",
        x: SNAP_MARGIN,
        y: Math.max(
          SNAP_MARGIN,
          Math.min(projectedY, viewportHeight - elementHeight - SNAP_MARGIN),
        ),
      };
    }
    if (minDistance === distanceToRight) {
      return {
        edge: "right",
        x: viewportWidth - elementWidth - SNAP_MARGIN,
        y: Math.max(
          SNAP_MARGIN,
          Math.min(projectedY, viewportHeight - elementHeight - SNAP_MARGIN),
        ),
      };
    }
    return {
      edge: "bottom",
      x: Math.max(
        SNAP_MARGIN,
        Math.min(projectedX, viewportWidth - elementWidth - SNAP_MARGIN),
      ),
      y: viewportHeight - elementHeight - SNAP_MARGIN,
    };
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isCollapsed()) return;

    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    pointerStartPosition = { x: event.clientX, y: event.clientY };

    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setIsDragging(true);
    setHasDragMoved(false);
    setVelocity({ x: 0, y: 0 });
    lastPointerPosition = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging()) return;

    const distanceMoved = Math.sqrt(
      Math.pow(event.clientX - pointerStartPosition.x, 2) +
        Math.pow(event.clientY - pointerStartPosition.y, 2),
    );

    if (distanceMoved > DRAG_THRESHOLD) {
      setHasDragMoved(true);
    }

    if (!hasDragMoved()) return;

    const now = performance.now();
    const deltaTime = now - lastPointerPosition.time;

    if (deltaTime > 0) {
      const newVelocityX = (event.clientX - lastPointerPosition.x) / deltaTime;
      const newVelocityY = (event.clientY - lastPointerPosition.y) / deltaTime;
      setVelocity({ x: newVelocityX, y: newVelocityY });
    }

    lastPointerPosition = { x: event.clientX, y: event.clientY, time: now };

    const newX = event.clientX - dragOffset().x;
    const newY = event.clientY - dragOffset().y;

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    if (!isDragging()) return;

    const didMove = hasDragMoved();
    setIsDragging(false);

    if (!didMove) {
      return;
    }

    didDragOccur = true;

    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    const currentVelocity = velocity();
    const snap = getSnapPosition(
      position().x,
      position().y,
      rect.width,
      rect.height,
      currentVelocity.x,
      currentVelocity.y,
    );
    const ratio = getRatioFromPosition(
      snap.edge,
      snap.x,
      snap.y,
      rect.width,
      rect.height,
    );

    setSnapEdge(snap.edge);
    setPositionRatio(ratio);
    setIsSnapping(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPosition({ x: snap.x, y: snap.y });
        saveToolbarState({
          edge: snap.edge,
          ratio,
          collapsed: isCollapsed(),
          enabled: props.enabled ?? true,
        });

        setTimeout(() => {
          setIsSnapping(false);
        }, 300);
      });
    });
  };

  const getCollapsedPosition = () => {
    const edge = snapEdge();
    const pos = position();

    switch (edge) {
      case "top":
        return { x: pos.x, y: 0 };
      case "bottom":
        return { x: pos.x, y: window.innerHeight - COLLAPSED_HEIGHT };
      case "left":
        return { x: 0, y: pos.y };
      case "right":
        return { x: window.innerWidth - COLLAPSED_WIDTH, y: pos.y };
      default:
        return pos;
    }
  };

  const chevronRotation = () => {
    const edge = snapEdge();
    const collapsed = isCollapsed();

    switch (edge) {
      case "top":
        return collapsed ? "rotate-180" : "rotate-0";
      case "bottom":
        return collapsed ? "rotate-0" : "rotate-180";
      case "left":
        return collapsed ? "rotate-90" : "-rotate-90";
      case "right":
        return collapsed ? "-rotate-90" : "rotate-90";
      default:
        return "rotate-0";
    }
  };

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleResize = () => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    if (isDragging()) return;

    setIsResizing(true);
    setIsVisible(false);
    recalculatePosition();

    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
      setIsVisible(true);
      setIsResizing(false);
    }, FADE_IN_DELAY_MS);
  };

  onMount(() => {
    const savedState = loadToolbarState();
    const rect = containerRef?.getBoundingClientRect();

    if (savedState && rect) {
      setSnapEdge(savedState.edge);
      setPositionRatio(savedState.ratio);
      setIsCollapsed(savedState.collapsed);
      const newPosition = getPositionFromEdgeAndRatio(
        savedState.edge,
        savedState.ratio,
        rect.width,
        rect.height,
      );
      setPosition(newPosition);
    } else if (rect) {
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: window.innerHeight - rect.height - SNAP_MARGIN,
      });
      setPositionRatio(0.5);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    const fadeInTimeout = setTimeout(() => {
      setIsVisible(true);
    }, FADE_IN_DELAY_MS);

    onCleanup(() => {
      clearTimeout(fadeInTimeout);
    });
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("resize", handleResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  });

  const currentPosition = () =>
    isCollapsed() ? getCollapsedPosition() : position();

  if (isMobile()) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-react-grab-ignore-events
      data-react-grab-toolbar
      class={cn(
        "fixed left-0 top-0 font-sans text-[13px] antialiased filter-[drop-shadow(0px_0px_4px_#51515180)] select-none",
        isCollapsed()
          ? "cursor-pointer"
          : isDragging()
            ? "cursor-grabbing"
            : "cursor-grab",
        isResizing()
          ? ""
          : isSnapping()
            ? "transition-[transform,opacity] duration-300 ease-out"
            : "transition-opacity duration-300 ease-out",
        isVisible() ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{
        "z-index": "2147483647",
        transform: `translate(${currentPosition().x}px, ${currentPosition().y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        class={cn(
          "[font-synthesis:none] contain-layout flex items-center justify-center rounded-sm bg-white antialiased transition-all duration-100 ease-out",
          isCollapsed() ? "" : "gap-1.5 px-2 py-1.5",
          isCollapsed() && snapEdge() === "top" && "rounded-t-none",
          isCollapsed() && snapEdge() === "bottom" && "rounded-b-none",
          isCollapsed() && snapEdge() === "left" && "rounded-l-none",
          isCollapsed() && snapEdge() === "right" && "rounded-r-none",
          isCollapsed() &&
            (snapEdge() === "top" || snapEdge() === "bottom") &&
            "px-2 py-0.25",
          isCollapsed() &&
            (snapEdge() === "left" || snapEdge() === "right") &&
            "px-0.25 py-2",
        )}
        onClick={(event) => {
          if (isCollapsed()) {
            event.stopPropagation();
            setIsCollapsed(false);
            saveToolbarState({
              edge: snapEdge(),
              ratio: positionRatio(),
              collapsed: false,
              enabled: props.enabled ?? true,
            });
          }
        }}
      >
        <div
          class={cn(
            "flex items-center gap-1.5 transition-all duration-100 ease-out overflow-hidden",
            isCollapsed() ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
          )}
        >
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-toggle
            class="contain-layout shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
            onClick={handleToggle}
          >
            <IconSelect
              size={14}
              class={cn(
                "transition-colors",
                props.isActive ? "text-black" : "text-black/70",
              )}
            />
          </button>
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-enabled
            class="contain-layout shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105 outline-none mx-0.5"
            onClick={handleToggleEnabled}
          >
            <div
              class={cn(
                "relative w-5 h-3 rounded-full transition-colors",
                props.enabled ? "bg-black" : "bg-black/25",
              )}
            >
              <div
                class={cn(
                  "absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform",
                  props.enabled ? "left-2.5" : "left-0.5",
                )}
              />
            </div>
          </button>
          <Show when={(props.commentCount ?? 0) > 0}>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-copy
              class="contain-layout shrink-0 flex items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-105 outline-none ml-1 px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20"
              onClick={handleCopyComments}
            >
              <IconCopy size={12} class="text-black/70" />
              <span class="text-[11px] font-medium text-black/70 tabular-nums">
                {props.commentCount}
              </span>
            </button>
          </Show>
        </div>
        <button
          data-react-grab-ignore-events
          data-react-grab-toolbar-collapse
          class="contain-layout shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          onClick={handleToggleCollapse}
        >
          <IconChevron
            class={cn(
              "text-[#B3B3B3] transition-transform duration-100",
              chevronRotation(),
            )}
          />
        </button>
      </div>
    </div>
  );
};
