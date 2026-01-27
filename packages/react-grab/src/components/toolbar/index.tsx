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
  TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
  TOOLBAR_DEFAULT_WIDTH_PX,
  TOOLBAR_DEFAULT_HEIGHT_PX,
  PANEL_BACKGROUND_GRADIENT,
  PANEL_BORDER_COLOR,
  PANEL_BOX_SHADOW,
  PANEL_OUTLINE,
  TOOLBAR_SHAKE_TOOLTIP_DURATION_MS,
} from "../../constants.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import { freezeUpdates } from "../../utils/freeze-updates.js";
import { Tooltip } from "../tooltip.jsx";

interface ToolbarProps {
  isActive?: boolean;
  isContextMenuOpen?: boolean;
  onToggle?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  shakeCount?: number;
  onStateChange?: (state: ToolbarState) => void;
  onSubscribeToStateChanges?: (
    callback: (state: ToolbarState) => void,
  ) => () => void;
  onSelectHoverChange?: (isHovered: boolean) => void;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let unfreezeUpdatesCallback: (() => void) | null = null;

  const [isMobile, setIsMobile] = createSignal(
    (window.visualViewport?.width ?? window.innerWidth) <
      TOOLBAR_MOBILE_BREAKPOINT_PX,
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
  const [isCollapseAnimating, setIsCollapseAnimating] = createSignal(false);
  const [isSelectTooltipVisible, setIsSelectTooltipVisible] =
    createSignal(false);
  const [isToggleTooltipVisible, setIsToggleTooltipVisible] =
    createSignal(false);
  const [isShakeTooltipVisible, setIsShakeTooltipVisible] = createSignal(false);

  const tooltipPosition = () => (snapEdge() === "top" ? "bottom" : "top");

  const collapsedEdgeClasses = () => {
    if (!isCollapsed()) return "";
    const edge = snapEdge();
    const roundedClass = {
      top: "rounded-t-none rounded-b-[7px]",
      bottom: "rounded-b-none rounded-t-[7px]",
      left: "rounded-l-none rounded-r-[7px]",
      right: "rounded-r-none rounded-l-[7px]",
    }[edge];
    const paddingClass =
      edge === "top" || edge === "bottom" ? "px-2 py-0.25" : "px-0.25 py-2";
    return `${roundedClass} ${paddingClass}`;
  };

  let shakeTooltipTimeout: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    on(
      () => props.shakeCount,
      (count) => {
        if (count && !props.enabled) {
          setIsShaking(true);
          setIsShakeTooltipVisible(true);

          if (shakeTooltipTimeout) {
            clearTimeout(shakeTooltipTimeout);
          }
          shakeTooltipTimeout = setTimeout(() => {
            setIsShakeTooltipVisible(false);
          }, TOOLBAR_SHAKE_TOOLTIP_DURATION_MS);
        }
      },
    ),
  );

  createEffect(
    on(
      () => props.enabled,
      (enabled) => {
        if (enabled && isShakeTooltipVisible()) {
          setIsShakeTooltipVisible(false);
          if (shakeTooltipTimeout) {
            clearTimeout(shakeTooltipTimeout);
          }
        }
      },
    ),
  );

  createEffect(
    on(
      () => [props.isActive, props.isContextMenuOpen] as const,
      ([isActive, isContextMenuOpen]) => {
        if (!isActive && !isContextMenuOpen && unfreezeUpdatesCallback) {
          unfreezeUpdatesCallback();
          unfreezeUpdatesCallback = null;
        }
      },
    ),
  );

  let lastPointerPosition = { x: 0, y: 0, time: 0 };
  let pointerStartPosition = { x: 0, y: 0 };
  let expandedDimensions = {
    width: TOOLBAR_DEFAULT_WIDTH_PX,
    height: TOOLBAR_DEFAULT_HEIGHT_PX,
  };
  let collapsedDimensions = {
    width: TOOLBAR_COLLAPSED_WIDTH_PX,
    height: TOOLBAR_COLLAPSED_HEIGHT_PX,
  };

  const clampToViewport = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(value, max));

  const getVisualViewport = () => {
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      return {
        width: visualViewport.width,
        height: visualViewport.height,
        offsetLeft: visualViewport.offsetLeft,
        offsetTop: visualViewport.offsetTop,
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
    };
  };

  const calculateExpandedPositionFromCollapsed = (
    collapsedPosition: { x: number; y: number },
    edge: SnapEdge,
  ): { position: { x: number; y: number }; ratio: number } => {
    const viewport = getVisualViewport();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const { width: expandedWidth, height: expandedHeight } = expandedDimensions;
    const actualRect = containerRef?.getBoundingClientRect();
    const actualCollapsedWidth =
      actualRect?.width ?? TOOLBAR_COLLAPSED_WIDTH_PX;
    const actualCollapsedHeight =
      actualRect?.height ?? TOOLBAR_COLLAPSED_HEIGHT_PX;

    let newPosition: { x: number; y: number };

    if (edge === "top" || edge === "bottom") {
      const xOffset = (expandedWidth - actualCollapsedWidth) / 2;
      const newExpandedX = collapsedPosition.x - xOffset;
      const clampedX = clampToViewport(
        newExpandedX,
        viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
        viewport.offsetLeft +
          viewportWidth -
          expandedWidth -
          TOOLBAR_SNAP_MARGIN_PX,
      );
      const newExpandedY =
        edge === "top"
          ? viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetTop +
            viewportHeight -
            expandedHeight -
            TOOLBAR_SNAP_MARGIN_PX;
      newPosition = { x: clampedX, y: newExpandedY };
    } else {
      const yOffset = (expandedHeight - actualCollapsedHeight) / 2;
      const newExpandedY = collapsedPosition.y - yOffset;
      const clampedY = clampToViewport(
        newExpandedY,
        viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
        viewport.offsetTop +
          viewportHeight -
          expandedHeight -
          TOOLBAR_SNAP_MARGIN_PX,
      );
      const newExpandedX =
        edge === "left"
          ? viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetLeft +
            viewportWidth -
            expandedWidth -
            TOOLBAR_SNAP_MARGIN_PX;
      newPosition = { x: newExpandedX, y: clampedY };
    }

    const ratio = getRatioFromPosition(
      edge,
      newPosition.x,
      newPosition.y,
      expandedWidth,
      expandedHeight,
    );

    return { position: newPosition, ratio };
  };

  const getPositionFromEdgeAndRatio = (
    edge: SnapEdge,
    ratio: number,
    elementWidth: number,
    elementHeight: number,
  ) => {
    const viewport = getVisualViewport();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const minX = viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX;
    const maxX = Math.max(
      minX,
      viewport.offsetLeft +
        viewportWidth -
        elementWidth -
        TOOLBAR_SNAP_MARGIN_PX,
    );
    const minY = viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX;
    const maxY = Math.max(
      minY,
      viewport.offsetTop +
        viewportHeight -
        elementHeight -
        TOOLBAR_SNAP_MARGIN_PX,
    );

    if (edge === "top" || edge === "bottom") {
      const availableWidth = Math.max(
        0,
        viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2,
      );
      const positionX = Math.min(
        maxX,
        Math.max(
          minX,
          viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX + availableWidth * ratio,
        ),
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
      Math.max(
        minY,
        viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX + availableHeight * ratio,
      ),
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
    const viewport = getVisualViewport();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    if (edge === "top" || edge === "bottom") {
      const availableWidth =
        viewportWidth - elementWidth - TOOLBAR_SNAP_MARGIN_PX * 2;
      if (availableWidth <= 0) return 0.5;
      return Math.max(
        0,
        Math.min(
          1,
          (positionX - viewport.offsetLeft - TOOLBAR_SNAP_MARGIN_PX) /
            availableWidth,
        ),
      );
    }
    const availableHeight =
      viewportHeight - elementHeight - TOOLBAR_SNAP_MARGIN_PX * 2;
    if (availableHeight <= 0) return 0.5;
    return Math.max(
      0,
      Math.min(
        1,
        (positionY - viewport.offsetTop - TOOLBAR_SNAP_MARGIN_PX) /
          availableHeight,
      ),
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
    const rect = containerRef?.getBoundingClientRect();
    const wasCollapsed = isCollapsed();
    let newRatio = positionRatio();

    if (wasCollapsed) {
      const { position: newPos, ratio } =
        calculateExpandedPositionFromCollapsed(currentPosition(), snapEdge());
      newRatio = ratio;
      setPosition(newPos);
      setPositionRatio(newRatio);
    } else if (rect) {
      expandedDimensions = { width: rect.width, height: rect.height };
    }

    setIsCollapseAnimating(true);
    setIsCollapsed((prev) => !prev);

    saveAndNotify({
      edge: snapEdge(),
      ratio: newRatio,
      collapsed: !wasCollapsed,
      enabled: props.enabled ?? true,
    });

    if (collapseAnimationTimeout) {
      clearTimeout(collapseAnimationTimeout);
    }
    collapseAnimationTimeout = setTimeout(() => {
      setIsCollapseAnimating(false);
      if (isCollapsed()) {
        const collapsedRect = containerRef?.getBoundingClientRect();
        if (collapsedRect) {
          collapsedDimensions = {
            width: collapsedRect.width,
            height: collapsedRect.height,
          };
        }
      }
    }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
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
    const viewport = getVisualViewport();
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const projectedX = currentX + velocityX * TOOLBAR_VELOCITY_MULTIPLIER_MS;
    const projectedY = currentY + velocityY * TOOLBAR_VELOCITY_MULTIPLIER_MS;

    const distanceToTop = projectedY - viewport.offsetTop + elementHeight / 2;
    const distanceToBottom =
      viewport.offsetTop + viewportHeight - projectedY - elementHeight / 2;
    const distanceToLeft = projectedX - viewport.offsetLeft + elementWidth / 2;
    const distanceToRight =
      viewport.offsetLeft + viewportWidth - projectedX - elementWidth / 2;

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
          viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedX,
            viewport.offsetLeft +
              viewportWidth -
              elementWidth -
              TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
        y: viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
      };
    }
    if (minDistance === distanceToLeft) {
      return {
        edge: "left",
        x: viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
        y: Math.max(
          viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedY,
            viewport.offsetTop +
              viewportHeight -
              elementHeight -
              TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
      };
    }
    if (minDistance === distanceToRight) {
      return {
        edge: "right",
        x:
          viewport.offsetLeft +
          viewportWidth -
          elementWidth -
          TOOLBAR_SNAP_MARGIN_PX,
        y: Math.max(
          viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX,
          Math.min(
            projectedY,
            viewport.offsetTop +
              viewportHeight -
              elementHeight -
              TOOLBAR_SNAP_MARGIN_PX,
          ),
        ),
      };
    }
    return {
      edge: "bottom",
      x: Math.max(
        viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX,
        Math.min(
          projectedX,
          viewport.offsetLeft +
            viewportWidth -
            elementWidth -
            TOOLBAR_SNAP_MARGIN_PX,
        ),
      ),
      y:
        viewport.offsetTop +
        viewportHeight -
        elementHeight -
        TOOLBAR_SNAP_MARGIN_PX,
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
    const { width: expandedWidth, height: expandedHeight } = expandedDimensions;
    const { width: collapsedWidth, height: collapsedHeight } =
      collapsedDimensions;
    const viewport = getVisualViewport();

    switch (edge) {
      case "top":
      case "bottom": {
        const xOffset = (expandedWidth - collapsedWidth) / 2;
        const centeredX = pos.x + xOffset;
        const clampedX = clampToViewport(
          centeredX,
          viewport.offsetLeft,
          viewport.offsetLeft + viewport.width - collapsedWidth,
        );
        return {
          x: clampedX,
          y:
            edge === "top"
              ? viewport.offsetTop
              : viewport.offsetTop + viewport.height - collapsedHeight,
        };
      }
      case "left":
      case "right": {
        const yOffset = (expandedHeight - collapsedHeight) / 2;
        const centeredY = pos.y + yOffset;
        const clampedY = clampToViewport(
          centeredY,
          viewport.offsetTop,
          viewport.offsetTop + viewport.height - collapsedHeight,
        );
        return {
          x:
            edge === "left"
              ? viewport.offsetLeft
              : viewport.offsetLeft + viewport.width - collapsedWidth,
          y: clampedY,
        };
      }
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
  let collapseAnimationTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleResize = () => {
    const viewport = getVisualViewport();
    setIsMobile(viewport.width < TOOLBAR_MOBILE_BREAKPOINT_PX);

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

      const rect = containerRef?.getBoundingClientRect();
      if (rect) {
        const newRatio = getRatioFromPosition(
          snapEdge(),
          position().x,
          position().y,
          rect.width,
          rect.height,
        );
        setPositionRatio(newRatio);
        saveAndNotify({
          edge: snapEdge(),
          ratio: newRatio,
          collapsed: isCollapsed(),
          enabled: props.enabled ?? true,
        });
      }
    }, TOOLBAR_FADE_IN_DELAY_MS);
  };

  const saveAndNotify = (state: ToolbarState) => {
    saveToolbarState(state);
    props.onStateChange?.(state);
  };

  onMount(() => {
    const savedState = loadToolbarState();
    const rect = containerRef?.getBoundingClientRect();
    const viewport = getVisualViewport();

    if (savedState) {
      setSnapEdge(savedState.edge);
      setPositionRatio(savedState.ratio);
      setIsCollapsed(savedState.collapsed);
      if (rect) {
        // HACK: On initial mount, the element is always rendered expanded (isCollapsed defaults to false).
        // So rect always measures expanded dimensions, regardless of savedState.collapsed.
        expandedDimensions = { width: rect.width, height: rect.height };
      }
      const newPosition = getPositionFromEdgeAndRatio(
        savedState.edge,
        savedState.ratio,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(newPosition);

      // HACK: If loading collapsed state, measure actual collapsed dimensions after re-render
      if (savedState.collapsed) {
        requestAnimationFrame(() => {
          const collapsedRect = containerRef?.getBoundingClientRect();
          if (collapsedRect) {
            collapsedDimensions = {
              width: collapsedRect.width,
              height: collapsedRect.height,
            };
          }
        });
      }
    } else if (rect) {
      expandedDimensions = { width: rect.width, height: rect.height };
      setPosition({
        x: viewport.offsetLeft + (viewport.width - rect.width) / 2,
        y:
          viewport.offsetTop +
          viewport.height -
          rect.height -
          TOOLBAR_SNAP_MARGIN_PX,
      });
      setPositionRatio(0.5);
    } else {
      const defaultPosition = getPositionFromEdgeAndRatio(
        "bottom",
        0.5,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(defaultPosition);
    }

    if (props.onSubscribeToStateChanges) {
      const unsubscribe = props.onSubscribeToStateChanges(
        (state: ToolbarState) => {
          if (isCollapseAnimating()) return;

          const rect = containerRef?.getBoundingClientRect();
          if (!rect) return;

          const didCollapsedChange = isCollapsed() !== state.collapsed;

          setSnapEdge(state.edge);

          if (didCollapsedChange && !state.collapsed) {
            const collapsedPos = currentPosition();
            setIsCollapseAnimating(true);
            setIsCollapsed(state.collapsed);
            const { position: newPos, ratio: newRatio } =
              calculateExpandedPositionFromCollapsed(collapsedPos, state.edge);
            setPosition(newPos);
            setPositionRatio(newRatio);
            if (collapseAnimationTimeout) {
              clearTimeout(collapseAnimationTimeout);
            }
            collapseAnimationTimeout = setTimeout(() => {
              setIsCollapseAnimating(false);
            }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
          } else {
            if (didCollapsedChange) {
              setIsCollapseAnimating(true);
              if (collapseAnimationTimeout) {
                clearTimeout(collapseAnimationTimeout);
              }
              collapseAnimationTimeout = setTimeout(() => {
                setIsCollapseAnimating(false);
              }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
            }
            setIsCollapsed(state.collapsed);
            const newPosition = getPositionFromEdgeAndRatio(
              state.edge,
              state.ratio,
              expandedDimensions.width,
              expandedDimensions.height,
            );
            setPosition(newPosition);
            setPositionRatio(state.ratio);
          }
        },
      );

      onCleanup(unsubscribe);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);

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
    window.visualViewport?.removeEventListener("scroll", handleResize);
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    if (collapseAnimationTimeout) {
      clearTimeout(collapseAnimationTimeout);
    }
    if (shakeTooltipTimeout) {
      clearTimeout(shakeTooltipTimeout);
    }
    unfreezeUpdatesCallback?.();
  });

  const currentPosition = () => {
    const collapsed = isCollapsed();
    return collapsed ? getCollapsedPosition() : position();
  };

  const getCursorClass = (): string => {
    if (isCollapsed()) {
      return "cursor-pointer";
    }
    if (isDragging()) {
      return "cursor-grabbing";
    }
    return "cursor-grab";
  };

  const getTransitionClass = (): string => {
    if (isResizing()) {
      return "";
    }
    if (isSnapping()) {
      return "transition-[transform,opacity] duration-300 ease-out";
    }
    if (isCollapseAnimating()) {
      return "transition-[transform,opacity] duration-150 ease-out";
    }
    return "transition-opacity duration-300 ease-out";
  };

  const getTransformOrigin = (): string => {
    const edge = snapEdge();
    switch (edge) {
      case "top":
        return "center top";
      case "bottom":
        return "center bottom";
      case "left":
        return "left center";
      case "right":
        return "right center";
      default:
        return "center center";
    }
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
          "transform-origin": getTransformOrigin(),
        }}
        onPointerDown={handlePointerDown}
      >
        <div
          class={cn(
            "[font-synthesis:none] flex items-center justify-center rounded-[7px] antialiased transition-all duration-150 ease-out relative overflow-visible",
            isCollapsed() ? "" : "h-7 gap-1.5 px-2",
            collapsedEdgeClasses(),
            isShaking() && "animate-shake",
          )}
          style={{
            "transform-origin": getTransformOrigin(),
            "background-image": PANEL_BACKGROUND_GRADIENT,
            "background-origin": "border-box",
            "border-color": PANEL_BORDER_COLOR,
            "border-style": "solid",
            "border-width": "1px",
            "box-shadow": PANEL_BOX_SHADOW,
            outline: PANEL_OUTLINE,
          }}
          onAnimationEnd={() => setIsShaking(false)}
          onClick={(event) => {
            if (isCollapsed()) {
              event.stopPropagation();
              const { position: newPos, ratio: newRatio } =
                calculateExpandedPositionFromCollapsed(
                  currentPosition(),
                  snapEdge(),
                );
              setPosition(newPos);
              setPositionRatio(newRatio);
              setIsCollapseAnimating(true);
              setIsCollapsed(false);
              saveAndNotify({
                edge: snapEdge(),
                ratio: newRatio,
                collapsed: false,
                enabled: props.enabled ?? true,
              });
              if (collapseAnimationTimeout) {
                clearTimeout(collapseAnimationTimeout);
              }
              collapseAnimationTimeout = setTimeout(() => {
                setIsCollapseAnimating(false);
              }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
            }
          }}
        >
          <div
            class={cn(
              "grid transition-all duration-150 ease-out",
              isCollapsed()
                ? "grid-cols-[0fr] opacity-0"
                : "grid-cols-[1fr] opacity-100",
            )}
          >
            <div class="flex items-center min-w-0">
              <div
                class={cn(
                  "grid transition-all duration-150 ease-out overflow-hidden",
                  props.enabled
                    ? "grid-cols-[1fr] opacity-100"
                    : "grid-cols-[0fr] opacity-0",
                )}
              >
                <div class="relative overflow-hidden min-w-0">
                  {/* HACK: Native events with stopImmediatePropagation prevent page-level dropdowns from closing */}
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-toolbar-toggle
                    class="contain-layout flex items-center justify-center cursor-pointer interactive-scale mr-1.5"
                    on:pointerdown={(event) => {
                      event.stopPropagation();
                      event.stopImmediatePropagation();
                    }}
                    on:mousedown={(event) => {
                      event.stopPropagation();
                      event.stopImmediatePropagation();
                    }}
                    onClick={(event) => {
                      setIsSelectTooltipVisible(false);
                      handleToggle(event);
                    }}
                    onMouseEnter={() => {
                      setIsSelectTooltipVisible(true);
                      props.onSelectHoverChange?.(true);
                      if (!unfreezeUpdatesCallback) {
                        unfreezeUpdatesCallback = freezeUpdates();
                      }
                    }}
                    onMouseLeave={() => {
                      setIsSelectTooltipVisible(false);
                      props.onSelectHoverChange?.(false);
                      if (!props.isActive && !props.isContextMenuOpen) {
                        unfreezeUpdatesCallback?.();
                        unfreezeUpdatesCallback = null;
                      }
                    }}
                  >
                    <IconSelect
                      size={14}
                      class={cn(
                        "transition-colors",
                        props.isActive ? "text-black" : "text-black/70",
                      )}
                    />
                  </button>
                  <Tooltip
                    visible={isSelectTooltipVisible() && !isCollapsed()}
                    position={tooltipPosition()}
                  >
                    Select element ({formatShortcut("C")})
                  </Tooltip>
                </div>
              </div>
              <div class="relative shrink-0 overflow-visible">
                <button
                  data-react-grab-ignore-events
                  data-react-grab-toolbar-enabled
                  class="contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none mx-0.5"
                  onClick={(event) => {
                    setIsToggleTooltipVisible(false);
                    handleToggleEnabled(event);
                  }}
                  onMouseEnter={() => setIsToggleTooltipVisible(true)}
                  onMouseLeave={() => setIsToggleTooltipVisible(false)}
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
                <Tooltip
                  visible={isToggleTooltipVisible() && !isCollapsed()}
                  position={tooltipPosition()}
                >
                  {props.enabled ? "Disable" : "Enable"}
                </Tooltip>
              </div>
            </div>
          </div>
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-collapse
            class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
            onClick={handleToggleCollapse}
          >
            <IconChevron
              class={cn(
                "text-[#B3B3B3] transition-transform duration-150",
                chevronRotation(),
              )}
            />
          </button>
          <Show when={isShakeTooltipVisible()}>
            <div
              class={cn(
                "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] text-black/60 bg-white shadow-sm pointer-events-none animate-tooltip-fade-in",
                tooltipPosition() === "top"
                  ? "bottom-full mb-0.5"
                  : "top-full mt-0.5",
              )}
              style={{ "z-index": "2147483647" }}
            >
              Enable to continue
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
