import {
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
  Show,
} from "solid-js";
import type { Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import {
  loadToolbarState,
  saveToolbarState,
  type SnapEdge,
  type ToolbarState,
} from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
import {
  TOOLBAR_SNAP_MARGIN_PX,
  TOOLBAR_MOBILE_BREAKPOINT_PX,
  TOOLBAR_FADE_IN_DELAY_MS,
  TOOLBAR_SNAP_ANIMATION_DURATION_MS,
  TOOLBAR_DRAG_THRESHOLD_PX,
  TOOLBAR_VELOCITY_MULTIPLIER_MS,
  TOOLBAR_COLLAPSED_WIDTH_PX,
  TOOLBAR_COLLAPSED_HEIGHT_PX,
} from "../../constants.js";

interface ToolbarProps {
  isActive?: boolean;
  onToggle?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  shakeCount?: number;
  onStateChange?: (state: ToolbarState) => void;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const [isMobile, setIsMobile] = createSignal(
    window.innerWidth < TOOLBAR_MOBILE_BREAKPOINT_PX,
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
  const [isShaking, setIsShaking] = createSignal(false);

  createEffect(
    on(
      () => props.shakeCount,
      (count) => {
        if (count && count > 0) {
          setIsShaking(true);
        }
      },
    ),
  );

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

    const minX = TOOLBAR_SNAP_MARGIN_PX;
    const maxX = Math.max(
      TOOLBAR_SNAP_MARGIN_PX,
      viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
    );
    const minY = TOOLBAR_SNAP_MARGIN_PX;
    const maxY = Math.max(
      TOOLBAR_SNAP_MARGIN_PX,
      viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
    );

    if (edge === "top" || edge === "bottom") {
      const availableWidth = Math.max(
        0,
        viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2,
      );
      const positionX = Math.min(
        maxX,
        Math.max(minX, TOOLBAR_SNAP_MARGIN_PX + availableWidth * ratio),
      );
      const positionY = edge === "top" ? minY : maxY;
      return { x: positionX, y: positionY };
    }

    const availableHeight = Math.max(
      0,
      viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX * 2,
    );
    const positionY = Math.min(
      maxY,
      Math.max(minY, TOOLBAR_SNAP_MARGIN_PX + availableHeight * ratio),
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
      const availableWidth =
        viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2;
      if (availableWidth <= 0) return 0.5;
      return Math.max(
        0,
        Math.min(1, (positionX - TOOLBAR_SNAP_MARGIN_PX) / availableWidth),
      );
    }
    const availableHeight =
      viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX * 2;
    if (availableHeight <= 0) return 0.5;
    return Math.max(
      0,
      Math.min(1, (positionY - TOOLBAR_SNAP_MARGIN_PX) / availableHeight),
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
      saveAndNotify({
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

    const projectedX = currentX + velocityX * TOOLBAR_VELOCITY_MULTIPLIER_MS;
    const projectedY = currentY + velocityY * TOOLBAR_VELOCITY_MULTIPLIER_MS;

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
          TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedX,
            viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
        y: TOOLBAR_SNAP_MARGIN_PX,
      };
    }
    if (minDistance === distanceToLeft) {
      return {
        edge: "left",
        x: TOOLBAR_SNAP_MARGIN_PX,
        y: Math.max(
          TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedY,
            viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
      };
    }
    if (minDistance === distanceToRight) {
      return {
        edge: "right",
        x: viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
        y: Math.max(
          TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedY,
            viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
      };
    }
    return {
      edge: "bottom",
      x: Math.max(
        TOOLBAR_SNAP_MARGIN_PX,
        Math.min(
          projectedX,
          viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX,
        ),
      ),
      y: viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX,
    };
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    if (!isDragging()) return;

    const distanceMoved = Math.sqrt(
      Math.pow(event.clientX - pointerStartPosition.x, 2) +
        Math.pow(event.clientY - pointerStartPosition.y, 2),
    );

    if (distanceMoved > TOOLBAR_DRAG_THRESHOLD_PX) {
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

  const handleWindowPointerUp = () => {
    if (!isDragging()) return;

    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);

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
        saveAndNotify({
          edge: snap.edge,
          ratio,
          collapsed: isCollapsed(),
          enabled: props.enabled ?? true,
        });

        setTimeout(() => {
          setIsSnapping(false);
        }, TOOLBAR_SNAP_ANIMATION_DURATION_MS);
      });
    });
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

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  const getCollapsedPosition = () => {
    const edge = snapEdge();
    const pos = position();

    switch (edge) {
      case "top":
        return { x: pos.x, y: 0 };
      case "bottom":
        return {
          x: pos.x,
          y: window.innerHeight - TOOLBAR_COLLAPSED_HEIGHT_PX,
        };
      case "left":
        return { x: 0, y: pos.y };
      case "right":
        return { x: window.innerWidth - TOOLBAR_COLLAPSED_WIDTH_PX, y: pos.y };
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
    setIsMobile(window.innerWidth < TOOLBAR_MOBILE_BREAKPOINT_PX);

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
    }, TOOLBAR_FADE_IN_DELAY_MS);
  };

  const saveAndNotify = (state: ToolbarState) => {
    saveToolbarState(state);
    props.onStateChange?.(state);
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
        y: window.innerHeight - rect.height - TOOLBAR_SNAP_MARGIN_PX,
      });
      setPositionRatio(0.5);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    const fadeInTimeout = setTimeout(() => {
      setIsVisible(true);
    }, TOOLBAR_FADE_IN_DELAY_MS);

    onCleanup(() => {
      clearTimeout(fadeInTimeout);
    });
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("resize", handleResize);
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  });

  const currentPosition = () =>
    isCollapsed() ? getCollapsedPosition() : position();

  const getCursorClass = (): string => {
    if (isCollapsed()) return "cursor-pointer";
    if (isDragging()) return "cursor-grabbing";
    return "cursor-grab";
  };

  const getTransitionClass = (): string => {
    if (isResizing()) return "";
    if (isSnapping())
      return "transition-[transform,opacity] duration-300 ease-out";
    return "transition-opacity duration-300 ease-out";
  };

  return (
    <Show when={!isMobile()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-toolbar
        class={cn(
          "fixed left-0 top-0 font-sans text-[13px] antialiased filter-[drop-shadow(0px_0px_4px_#51515180)] select-none",
          getCursorClass(),
          getTransitionClass(),
          isVisible() ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{
          "z-index": "2147483647",
          transform: `translate(${currentPosition().x}px, ${currentPosition().y}px)`,
        }}
        onPointerDown={handlePointerDown}
      >
        <div
          class={cn(
            "[font-synthesis:none] contain-layout flex items-center justify-center rounded-sm bg-white antialiased transition-all duration-100 ease-out",
            isCollapsed() ? "" : "h-7 gap-1.5 px-2",
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
            isShaking() && "animate-shake",
          )}
          onAnimationEnd={() => setIsShaking(false)}
          onClick={(event) => {
            if (isCollapsed()) {
              event.stopPropagation();
              setIsCollapsed(false);
              saveAndNotify({
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
            <Show when={props.enabled}>
              <button
                data-react-grab-ignore-events
                data-react-grab-toolbar-toggle
                class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
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
            </Show>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-enabled
              class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale outline-none mx-0.5"
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
          </div>
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-collapse
            class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
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
    </Show>
  );
};
