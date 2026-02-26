import {
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
  Show,
} from "solid-js";
import type { Component } from "solid-js";
import type { ToolbarMenuAction } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import {
  loadToolbarState,
  saveToolbarState,
  type SnapEdge,
  type ToolbarState,
} from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconChevron } from "../icons/icon-chevron.jsx";
import { IconClock } from "../icons/icon-clock.jsx";
import { IconCopy } from "../icons/icon-copy.jsx";
import { IconEllipsis } from "../icons/icon-ellipsis.jsx";
import {
  createSafePolygonTracker,
  type TargetRect,
} from "../../utils/safe-polygon.js";
import {
  TOOLBAR_SNAP_MARGIN_PX,
  TOOLBAR_FADE_IN_DELAY_MS,
  TOOLBAR_SNAP_ANIMATION_DURATION_MS,
  TOOLBAR_DRAG_THRESHOLD_PX,
  TOOLBAR_VELOCITY_MULTIPLIER_MS,
  TOOLBAR_COLLAPSED_SHORT_PX,
  TOOLBAR_COLLAPSED_LONG_PX,
  TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
  TOGGLE_ANIMATION_BUFFER_MS,
  TOOLBAR_DEFAULT_WIDTH_PX,
  TOOLBAR_DEFAULT_HEIGHT_PX,
  TOOLBAR_SHAKE_TOOLTIP_DURATION_MS,
  FEEDBACK_DURATION_MS,
  SAFE_POLYGON_BUFFER_PX,
  PANEL_STYLES,
} from "../../constants.js";
import { freezeUpdates } from "../../utils/freeze-updates.js";
import {
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
} from "../../utils/freeze-animations.js";
import {
  freezePseudoStates,
  unfreezePseudoStates,
} from "../../utils/freeze-pseudo-states.js";
import { Tooltip } from "../tooltip.jsx";
import {
  getExpandGridClass,
  getButtonSpacingClass,
  getMinDimensionClass,
  getHitboxConstraintClass,
} from "../../utils/toolbar-layout.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";

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
  onContainerRef?: (element: HTMLDivElement) => void;
  historyItemCount?: number;
  clockFlashTrigger?: number;
  hasUnreadHistoryItems?: boolean;
  onToggleHistory?: () => void;
  onCopyAll?: () => void;
  onCopyAllHover?: (isHovered: boolean) => void;
  onHistoryButtonHover?: (isHovered: boolean) => void;
  isHistoryDropdownOpen?: boolean;
  isClearPromptOpen?: boolean;
  isHistoryPinned?: boolean;
  toolbarActions?: ToolbarMenuAction[];
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

interface FreezeHandlersOptions {
  shouldFreezeInteractions?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
  safePolygonTargets?: () => TargetRect[] | null;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let expandableButtonsRef: HTMLDivElement | undefined;
  let unfreezeUpdatesCallback: (() => void) | null = null;
  let lastKnownExpandableWidth = 0;
  let lastKnownExpandableHeight = 0;

  const safePolygonTracker = createSafePolygonTracker();

  const getElementRect = (selector: string): TargetRect | null => {
    if (!containerRef) return null;
    const rootNode = containerRef.getRootNode() as Document | ShadowRoot;
    const element = rootNode.querySelector<HTMLElement>(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x - SAFE_POLYGON_BUFFER_PX,
      y: rect.y - SAFE_POLYGON_BUFFER_PX,
      width: rect.width + SAFE_POLYGON_BUFFER_PX * 2,
      height: rect.height + SAFE_POLYGON_BUFFER_PX * 2,
    };
  };

  const getSafePolygonTargets = (
    ...selectors: string[]
  ): TargetRect[] | null => {
    const rects: TargetRect[] = [];
    for (const selector of selectors) {
      const rect = getElementRect(selector);
      if (rect) rects.push(rect);
    }
    return rects.length > 0 ? rects : null;
  };

  const savedState = loadToolbarState();

  const [isVisible, setIsVisible] = createSignal(false);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isSnapping, setIsSnapping] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>(
    savedState?.edge ?? "bottom",
  );
  const [positionRatio, setPositionRatio] = createSignal(
    savedState?.ratio ?? 0.5,
  );
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
  const [isToggleAnimating, setIsToggleAnimating] = createSignal(false);
  const [isRapidRetoggle, setIsRapidRetoggle] = createSignal(false);
  const [isHistoryTooltipVisible, setIsHistoryTooltipVisible] =
    createSignal(false);
  const [isMenuTooltipVisible, setIsMenuTooltipVisible] = createSignal(false);
  const [isCopyAllTooltipVisible, setIsCopyAllTooltipVisible] =
    createSignal(false);
  let clockFlashRef: HTMLSpanElement | undefined;

  const hasToolbarActions = () => (props.toolbarActions ?? []).length > 0;

  const historyTooltipLabel = () => {
    const count = props.historyItemCount ?? 0;
    return count > 0 ? `History (${count})` : "History";
  };

  const historyIconClass = () =>
    cn(
      "transition-colors",
      props.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]",
    );

  const isVertical = () => snapEdge() === "left" || snapEdge() === "right";

  const measureExpandableDimension = () => {
    if (!expandableButtonsRef) return;
    const rect = expandableButtonsRef.getBoundingClientRect();
    if (isVertical()) {
      lastKnownExpandableHeight = rect.height;
    } else {
      lastKnownExpandableWidth = rect.width;
    }
  };

  const isTooltipAllowed = () =>
    !isCollapsed() &&
    !props.isHistoryDropdownOpen &&
    !props.isMenuOpen &&
    !props.isClearPromptOpen;

  const tooltipPosition = (): "top" | "bottom" | "left" | "right" => {
    const edge = snapEdge();
    switch (edge) {
      case "top":
        return "bottom";
      case "bottom":
        return "top";
      case "left":
        return "right";
      case "right":
        return "left";
    }
  };

  const expandGridClass = (
    isExpanded: boolean,
    collapsedExtra?: string,
  ): string => getExpandGridClass(isVertical(), isExpanded, collapsedExtra);

  const gridTransitionClass = () =>
    isVertical()
      ? "transition-[grid-template-rows,opacity] duration-150 ease-out"
      : "transition-[grid-template-columns,opacity] duration-150 ease-out";

  const buttonSpacingClass = () => getButtonSpacingClass(isVertical());
  const minDimensionClass = () => getMinDimensionClass(isVertical());
  const hitboxConstraintClass = () => getHitboxConstraintClass(isVertical());

  const shakeTooltipPositionClass = (): string => {
    const tooltipSide = tooltipPosition();
    if (isVertical()) {
      const placementClass =
        tooltipSide === "left" ? "right-full mr-0.5" : "left-full ml-0.5";
      return `top-1/2 -translate-y-1/2 ${placementClass}`;
    }
    const placementClass =
      tooltipSide === "top" ? "bottom-full mb-0.5" : "top-full mt-0.5";
    return `left-1/2 -translate-x-1/2 ${placementClass}`;
  };

  const stopEventPropagation = (event: Event) => {
    event.stopImmediatePropagation();
  };

  const createFreezeHandlers = (
    setTooltipVisible: (visible: boolean) => void,
    options?: FreezeHandlersOptions,
  ) => ({
    onMouseEnter: () => {
      if (isDragging()) return;
      safePolygonTracker.stop();
      setTooltipVisible(true);
      if (
        options?.shouldFreezeInteractions !== false &&
        !unfreezeUpdatesCallback
      ) {
        unfreezeUpdatesCallback = freezeUpdates();
        freezeGlobalAnimations();
        freezePseudoStates();
      }
      options?.onHoverChange?.(true);
    },
    onMouseLeave: (event: MouseEvent) => {
      setTooltipVisible(false);
      if (
        options?.shouldFreezeInteractions !== false &&
        !props.isActive &&
        !props.isContextMenuOpen
      ) {
        unfreezeUpdatesCallback?.();
        unfreezeUpdatesCallback = null;
        unfreezeGlobalAnimations();
        unfreezePseudoStates();
      }

      const targetRects = options?.safePolygonTargets?.();
      if (targetRects) {
        safePolygonTracker.start(
          { x: event.clientX, y: event.clientY },
          targetRects,
          () => options?.onHoverChange?.(false),
        );
        return;
      }

      options?.onHoverChange?.(false);
    },
  });

  const collapsedEdgeClasses = () => {
    if (!isCollapsed()) return "";
    const edge = snapEdge();
    const roundedClass = {
      top: "rounded-t-none rounded-b-[10px]",
      bottom: "rounded-b-none rounded-t-[10px]",
      left: "rounded-l-none rounded-r-[10px]",
      right: "rounded-r-none rounded-l-[10px]",
    }[edge];
    const paddingClass = isVertical() ? "px-0.25 py-2" : "px-2 py-0.25";
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

  const reclampToolbarToViewport = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    expandedDimensions = { width: rect.width, height: rect.height };

    const currentPos = position();
    const viewport = getVisualViewport();
    const edge = snapEdge();
    let clampedX = currentPos.x;
    let clampedY = currentPos.y;

    if (edge === "top" || edge === "bottom") {
      const minX = viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX;
      const maxX = Math.max(
        minX,
        viewport.offsetLeft +
          viewport.width -
          rect.width -
          TOOLBAR_SNAP_MARGIN_PX,
      );
      clampedX = clampToViewport(currentPos.x, minX, maxX);
      clampedY =
        edge === "top"
          ? viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetTop +
            viewport.height -
            rect.height -
            TOOLBAR_SNAP_MARGIN_PX;
    } else {
      const minY = viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX;
      const maxY = Math.max(
        minY,
        viewport.offsetTop +
          viewport.height -
          rect.height -
          TOOLBAR_SNAP_MARGIN_PX,
      );
      clampedY = clampToViewport(currentPos.y, minY, maxY);
      clampedX =
        edge === "left"
          ? viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetLeft +
            viewport.width -
            rect.width -
            TOOLBAR_SNAP_MARGIN_PX;
    }

    const newRatio = getRatioFromPosition(
      edge,
      clampedX,
      clampedY,
      rect.width,
      rect.height,
    );
    setPositionRatio(newRatio);

    const didPositionChange =
      clampedX !== currentPos.x || clampedY !== currentPos.y;
    if (didPositionChange) {
      setIsCollapseAnimating(true);
      nativeRequestAnimationFrame(() => {
        nativeRequestAnimationFrame(() => {
          setPosition({ x: clampedX, y: clampedY });
          if (collapseAnimationTimeout) {
            clearTimeout(collapseAnimationTimeout);
          }
          collapseAnimationTimeout = setTimeout(() => {
            setIsCollapseAnimating(false);
          }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
        });
      });
    }
  };

  createEffect(
    on(
      () => props.clockFlashTrigger ?? 0,
      () => {
        if (props.isHistoryDropdownOpen) return;
        if (clockFlashRef) {
          clockFlashRef.classList.remove("animate-clock-flash");
          // HACK: force reflow between class removal/addition to restart the CSS animation
          void clockFlashRef.offsetHeight;
          clockFlashRef.classList.add("animate-clock-flash");
        }
        setIsHistoryTooltipVisible(true);
        const timerId = setTimeout(() => {
          clockFlashRef?.classList.remove("animate-clock-flash");
          setIsHistoryTooltipVisible(false);
        }, FEEDBACK_DURATION_MS);
        onCleanup(() => {
          clearTimeout(timerId);
          setIsHistoryTooltipVisible(false);
        });
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.historyItemCount ?? 0,
      () => {
        if (isCollapsed()) return;
        // HACK: Wait for grid-cols CSS transition to complete, then re-measure and clamp to viewport
        if (historyItemCountTimeout) {
          clearTimeout(historyItemCountTimeout);
        }
        historyItemCountTimeout = setTimeout(() => {
          measureExpandableDimension();
          reclampToolbarToViewport();
        }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
        onCleanup(() => {
          if (historyItemCountTimeout) {
            clearTimeout(historyItemCountTimeout);
          }
        });
      },
      { defer: true },
    ),
  );

  let lastPointerPosition = { x: 0, y: 0, time: 0 };
  let pointerStartPosition = { x: 0, y: 0 };
  let expandedDimensions = {
    width: TOOLBAR_DEFAULT_WIDTH_PX,
    height: TOOLBAR_DEFAULT_HEIGHT_PX,
  };
  const [collapsedDimensions, setCollapsedDimensions] = createSignal({
    width: TOOLBAR_COLLAPSED_SHORT_PX,
    height: TOOLBAR_COLLAPSED_SHORT_PX,
  });

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
      actualRect?.width ?? TOOLBAR_COLLAPSED_SHORT_PX;
    const actualCollapsedHeight =
      actualRect?.height ?? TOOLBAR_COLLAPSED_SHORT_PX;

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
    const newPosition = getPositionFromEdgeAndRatio(
      snapEdge(),
      positionRatio(),
      expandedDimensions.width,
      expandedDimensions.height,
    );
    setPosition(newPosition);
  };

  let didDragOccur = false;

  const createDragAwareHandler =
    (callback: () => void) => (event: MouseEvent) => {
      event.stopImmediatePropagation();
      if (didDragOccur) {
        didDragOccur = false;
        return;
      }
      callback();
    };

  const handleToggle = createDragAwareHandler(() => props.onToggle?.());

  const handleHistory = createDragAwareHandler(() => props.onToggleHistory?.());

  const handleCopyAll = createDragAwareHandler(() => props.onCopyAll?.());

  const handleToggleMenu = createDragAwareHandler(() => props.onToggleMenu?.());

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
          setCollapsedDimensions({
            width: collapsedRect.width,
            height: collapsedRect.height,
          });
        }
      }
    }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
  });

  const handleToggleEnabled = createDragAwareHandler(() => {
    const isCurrentlyEnabled = Boolean(props.enabled);
    const edge = snapEdge();
    const preTogglePosition = position();
    const isVerticalEdge = edge === "left" || edge === "right";

    const readExpandableDimension = () =>
      isVerticalEdge ? lastKnownExpandableHeight : lastKnownExpandableWidth;

    // HACK: Skip measuring during an active toggle animation — the CSS grid transition is
    // mid-flight so getBoundingClientRect returns a partial value that contaminates
    // lastKnownExpandableWidth and causes permanent position drift.
    if (isCurrentlyEnabled && expandableButtonsRef && !isToggleAnimating()) {
      measureExpandableDimension();
    }
    let expandableDimension = readExpandableDimension();
    let shouldCompensatePosition = expandableDimension > 0;

    let currentRenderedDimension = 0;
    if (expandableButtonsRef) {
      const expandableRect = expandableButtonsRef.getBoundingClientRect();
      currentRenderedDimension = isVerticalEdge
        ? expandableRect.height
        : expandableRect.width;
    }

    // HACK: On first enable, expandable buttons are collapsed (0fr) so getBoundingClientRect
    // returns 0. Temporarily force the relevant grid wrappers to 1fr without transitions to measure
    // the real dimension synchronously, then restore. The browser never renders the intermediate state.
    if (
      !isCurrentlyEnabled &&
      expandableDimension === 0 &&
      expandableButtonsRef
    ) {
      const hasHistoryItems = (props.historyItemCount ?? 0) > 0;
      const hasMenuActions = hasToolbarActions();
      const expandedWrappers = Array.from(expandableButtonsRef.children).filter(
        (child): child is HTMLElement => {
          if (!(child instanceof HTMLElement)) return false;
          if (child.querySelector("[data-react-grab-toolbar-history]")) {
            return hasHistoryItems;
          }
          if (child.querySelector("[data-react-grab-toolbar-copy-all]")) {
            return Boolean(props.isHistoryDropdownOpen);
          }
          if (child.querySelector("[data-react-grab-toolbar-menu]")) {
            return hasMenuActions;
          }
          return true;
        },
      );
      const gridProperty = isVerticalEdge
        ? "gridTemplateRows"
        : "gridTemplateColumns";
      for (const wrapper of expandedWrappers) {
        wrapper.style.transition = "none";
        wrapper.style[gridProperty] = "1fr";
      }
      void expandableButtonsRef.offsetWidth;
      measureExpandableDimension();
      expandableDimension = readExpandableDimension();
      for (const wrapper of expandedWrappers) {
        wrapper.style[gridProperty] = "";
      }
      void expandableButtonsRef.offsetWidth;
      for (const wrapper of expandedWrappers) {
        wrapper.style.transition = "";
      }
      shouldCompensatePosition = expandableDimension > 0;
    }

    if (shouldCompensatePosition) {
      setIsRapidRetoggle(isToggleAnimating());
      setIsToggleAnimating(true);
    }

    props.onToggleEnabled?.();

    if (shouldCompensatePosition) {
      const dimensionChange = isCurrentlyEnabled
        ? -expandableDimension
        : expandableDimension;

      if (isVerticalEdge) {
        expandedDimensions = {
          width: expandedDimensions.width,
          height: expandedDimensions.height + dimensionChange,
        };
      } else {
        expandedDimensions = {
          width: expandedDimensions.width + dimensionChange,
          height: expandedDimensions.height,
        };
      }

      const collapsedAxisPosition = isVerticalEdge
        ? preTogglePosition.y + currentRenderedDimension
        : preTogglePosition.x + currentRenderedDimension;

      const computeClampedPosition = (
        expandDimension: number,
      ): { x: number; y: number } => {
        const viewport = getVisualViewport();
        const targetAxisPosition = collapsedAxisPosition - expandDimension;
        if (isVerticalEdge) {
          const clampMin = viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX;
          const clampMax =
            viewport.offsetTop +
            viewport.height -
            expandedDimensions.height -
            TOOLBAR_SNAP_MARGIN_PX;
          return {
            x: preTogglePosition.x,
            y: clampToViewport(targetAxisPosition, clampMin, clampMax),
          };
        }
        const clampMin = viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX;
        const clampMax =
          viewport.offsetLeft +
          viewport.width -
          expandedDimensions.width -
          TOOLBAR_SNAP_MARGIN_PX;
        return {
          x: clampToViewport(targetAxisPosition, clampMin, clampMax),
          y: preTogglePosition.y,
        };
      };

      if (toggleAnimationRafId !== undefined) {
        nativeCancelAnimationFrame(toggleAnimationRafId);
      }

      if (isRapidRetoggle()) {
        const finalExpandDimension = isCurrentlyEnabled
          ? 0
          : expandableDimension;
        setPosition(computeClampedPosition(finalExpandDimension));
        toggleAnimationRafId = undefined;
      } else {
        const animationStartTime = performance.now();
        const syncPositionWithGrid = () => {
          const elapsed = performance.now() - animationStartTime;
          if (
            elapsed >
            TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS + TOGGLE_ANIMATION_BUFFER_MS
          ) {
            toggleAnimationRafId = undefined;
            return;
          }
          if (expandableButtonsRef) {
            const currentExpandDimension = isVerticalEdge
              ? expandableButtonsRef.getBoundingClientRect().height
              : expandableButtonsRef.getBoundingClientRect().width;
            setPosition(computeClampedPosition(currentExpandDimension));
          }
          toggleAnimationRafId =
            nativeRequestAnimationFrame(syncPositionWithGrid);
        };
        toggleAnimationRafId =
          nativeRequestAnimationFrame(syncPositionWithGrid);
      }

      clearTimeout(toggleAnimationTimeout);
      toggleAnimationTimeout = setTimeout(() => {
        if (toggleAnimationRafId !== undefined) {
          nativeCancelAnimationFrame(toggleAnimationRafId);
          toggleAnimationRafId = undefined;
        }
        // HACK: Under heavy system load the rAF loop may not have run enough
        // frames to fully track the CSS grid transition. Snap to the final
        // expected position so the toggle button never drifts.
        const finalExpandDimension = isCurrentlyEnabled
          ? 0
          : expandableDimension;
        setPosition(computeClampedPosition(finalExpandDimension));
        setIsToggleAnimating(false);
        setIsRapidRetoggle(false);
        const newRatio = getRatioFromPosition(
          edge,
          position().x,
          position().y,
          expandedDimensions.width,
          expandedDimensions.height,
        );
        setPositionRatio(newRatio);
        saveAndNotify({
          edge,
          ratio: newRatio,
          collapsed: isCollapsed(),
          enabled: !isCurrentlyEnabled,
        });
      }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
    } else {
      saveAndNotify({
        edge,
        ratio: positionRatio(),
        collapsed: isCollapsed(),
        enabled: !isCurrentlyEnabled,
      });
    }
  });

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
      if (unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback();
        unfreezeUpdatesCallback = null;
        unfreezeGlobalAnimations();
        unfreezePseudoStates();
      }
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

    nativeRequestAnimationFrame(() => {
      const postRenderRect = containerRef?.getBoundingClientRect();
      if (postRenderRect) {
        expandedDimensions = {
          width: postRenderRect.width,
          height: postRenderRect.height,
        };
      }

      nativeRequestAnimationFrame(() => {
        const snappedPosition = getPositionFromEdgeAndRatio(
          snap.edge,
          ratio,
          expandedDimensions.width,
          expandedDimensions.height,
        );

        setPosition(snappedPosition);
        saveAndNotify({
          edge: snap.edge,
          ratio,
          collapsed: isCollapsed(),
          enabled: props.enabled ?? true,
        });

        snapAnimationTimeout = setTimeout(() => {
          setIsSnapping(false);
          if (props.enabled) {
            measureExpandableDimension();
          }
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
      collapsedDimensions();
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
  let snapAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let toggleAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let toggleAnimationRafId: number | undefined;
  let historyItemCountTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleResize = () => {
    if (isDragging()) return;

    setIsResizing(true);
    recalculatePosition();

    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
      setIsResizing(false);

      const newRatio = getRatioFromPosition(
        snapEdge(),
        position().x,
        position().y,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPositionRatio(newRatio);
      saveAndNotify({
        edge: snapEdge(),
        ratio: newRatio,
        collapsed: isCollapsed(),
        enabled: props.enabled ?? true,
      });
    }, TOOLBAR_FADE_IN_DELAY_MS);
  };

  const saveAndNotify = (state: ToolbarState) => {
    saveToolbarState(state);
    props.onStateChange?.(state);
  };

  onMount(() => {
    if (containerRef) {
      props.onContainerRef?.(containerRef);
    }

    const rect = containerRef?.getBoundingClientRect();
    const viewport = getVisualViewport();

    if (savedState) {
      if (rect) {
        // HACK: On initial mount, the element is always rendered expanded (isCollapsed defaults to false).
        // So rect always measures expanded dimensions, regardless of savedState.collapsed.
        expandedDimensions = { width: rect.width, height: rect.height };
      }
      if (savedState.collapsed) {
        const isHorizontalEdge =
          savedState.edge === "top" || savedState.edge === "bottom";
        setCollapsedDimensions({
          width: isHorizontalEdge
            ? TOOLBAR_COLLAPSED_LONG_PX
            : TOOLBAR_COLLAPSED_SHORT_PX,
          height: isHorizontalEdge
            ? TOOLBAR_COLLAPSED_SHORT_PX
            : TOOLBAR_COLLAPSED_LONG_PX,
        });
      }
      setIsCollapsed(savedState.collapsed);
      const newPosition = getPositionFromEdgeAndRatio(
        savedState.edge,
        savedState.ratio,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(newPosition);
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

    if (props.enabled) {
      measureExpandableDimension();
    }

    if (props.onSubscribeToStateChanges) {
      const unsubscribe = props.onSubscribeToStateChanges(
        (state: ToolbarState) => {
          if (isCollapseAnimating() || isToggleAnimating()) return;

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
            clearTimeout(collapseAnimationTimeout);
            collapseAnimationTimeout = setTimeout(() => {
              setIsCollapseAnimating(false);
            }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
          } else {
            if (didCollapsedChange) {
              setIsCollapseAnimating(true);
              clearTimeout(collapseAnimationTimeout);
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
    clearTimeout(resizeTimeout);
    clearTimeout(collapseAnimationTimeout);
    clearTimeout(shakeTooltipTimeout);
    clearTimeout(snapAnimationTimeout);
    clearTimeout(toggleAnimationTimeout);
    clearTimeout(historyItemCountTimeout);
    if (toggleAnimationRafId !== undefined) {
      nativeCancelAnimationFrame(toggleAnimationRafId);
    }
    unfreezeUpdatesCallback?.();
    safePolygonTracker.stop();
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
    if (isToggleAnimating()) {
      return "transition-opacity duration-150 ease-out";
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
    <div
      ref={containerRef}
      data-react-grab-ignore-events
      data-react-grab-toolbar
      class={cn(
        "fixed left-0 top-0 font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none",
        getCursorClass(),
        getTransitionClass(),
        isVisible()
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
      style={{
        "z-index": "2147483647",
        transform: `translate(${currentPosition().x}px, ${
          currentPosition().y
        }px)`,
        "transform-origin": getTransformOrigin(),
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => props.onSelectHoverChange?.(true)}
      onMouseLeave={() => props.onSelectHoverChange?.(false)}
    >
      <div
        class={cn(
          "flex items-center justify-center rounded-[10px] antialiased relative overflow-visible [font-synthesis:none] [corner-shape:superellipse(1.25)]",
          isVertical() && "flex-col",
          PANEL_STYLES,
          !isCollapsed() &&
            (isVertical() ? "px-1.5 gap-1.5 py-2" : "py-1.5 gap-1.5 px-2"),
          collapsedEdgeClasses(),
          isShaking() && "animate-shake",
        )}
        style={{ "transform-origin": getTransformOrigin() }}
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
            "grid",
            !isRapidRetoggle() && gridTransitionClass(),
            expandGridClass(!isCollapsed(), "pointer-events-none"),
          )}
        >
          <div
            class={cn(
              "flex",
              isVertical()
                ? "flex-col items-center min-h-0"
                : "items-center min-w-0",
            )}
          >
            <div
              ref={expandableButtonsRef}
              class={cn("flex items-center", isVertical() && "flex-col")}
            >
              <div
                class={cn(
                  "grid",
                  !isRapidRetoggle() && gridTransitionClass(),
                  expandGridClass(Boolean(props.enabled)),
                )}
              >
                <div
                  class={cn("relative overflow-visible", minDimensionClass())}
                >
                  {/* HACK: Native events with stopImmediatePropagation prevent page-level dropdowns from closing */}
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-toolbar-toggle
                    aria-label={
                      props.isActive ? "Stop selecting element" : "Select element"
                    }
                    aria-pressed={Boolean(props.isActive)}
                    class={cn(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      buttonSpacingClass(),
                      hitboxConstraintClass(),
                    )}
                    on:pointerdown={(event) => {
                      stopEventPropagation(event);
                      handlePointerDown(event);
                    }}
                    on:mousedown={stopEventPropagation}
                    onClick={(event) => {
                      setIsSelectTooltipVisible(false);
                      handleToggle(event);
                    }}
                    {...createFreezeHandlers(setIsSelectTooltipVisible)}
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
                    visible={isSelectTooltipVisible() && isTooltipAllowed()}
                    position={tooltipPosition()}
                  >
                    Select element ({formatShortcut("C")})
                  </Tooltip>
                </div>
              </div>
              <div
                class={cn(
                  "grid",
                  !isRapidRetoggle() && gridTransitionClass(),
                  expandGridClass(
                    Boolean(props.enabled) && (props.historyItemCount ?? 0) > 0,
                    "pointer-events-none",
                  ),
                )}
              >
                <div
                  class={cn("relative overflow-visible", minDimensionClass())}
                >
                  {/* HACK: Native events with stopImmediatePropagation prevent page-level dropdowns from closing */}
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-toolbar-history
                    aria-label={`Open history${
                      (props.historyItemCount ?? 0) > 0
                        ? ` (${props.historyItemCount ?? 0} items)`
                        : ""
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={Boolean(props.isHistoryDropdownOpen)}
                    class={cn(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      buttonSpacingClass(),
                      hitboxConstraintClass(),
                    )}
                    on:pointerdown={(event) => {
                      stopEventPropagation(event);
                      handlePointerDown(event);
                    }}
                    on:mousedown={stopEventPropagation}
                    onClick={(event) => {
                      setIsHistoryTooltipVisible(false);
                      handleHistory(event);
                    }}
                    {...createFreezeHandlers(
                      (visible) => {
                        if (visible && props.isHistoryDropdownOpen) return;
                        setIsHistoryTooltipVisible(visible);
                      },
                      {
                        onHoverChange: (isHovered) =>
                          props.onHistoryButtonHover?.(isHovered),
                        shouldFreezeInteractions: false,
                        safePolygonTargets: () =>
                          props.isHistoryDropdownOpen
                            ? getSafePolygonTargets(
                                "[data-react-grab-history-dropdown]",
                                "[data-react-grab-toolbar-copy-all]",
                              )
                            : null,
                      },
                    )}
                  >
                    <span ref={clockFlashRef} class="inline-flex relative">
                      <IconClock size={14} class={historyIconClass()} />
                      <Show when={props.hasUnreadHistoryItems}>
                        <span
                          data-react-grab-unread-indicator
                          class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#404040]"
                        />
                      </Show>
                    </span>
                  </button>
                  <Tooltip
                    visible={isHistoryTooltipVisible() && isTooltipAllowed()}
                    position={tooltipPosition()}
                  >
                    {historyTooltipLabel()}
                  </Tooltip>
                </div>
              </div>
              <div
                class={cn(
                  "grid",
                  !isRapidRetoggle() && gridTransitionClass(),
                  expandGridClass(
                    Boolean(props.isHistoryDropdownOpen),
                    "pointer-events-none",
                  ),
                )}
              >
                <div
                  class={cn("relative overflow-visible", minDimensionClass())}
                >
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-toolbar-copy-all
                    aria-label="Copy all history items"
                    class={cn(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      buttonSpacingClass(),
                      hitboxConstraintClass(),
                    )}
                    on:pointerdown={(event) => {
                      stopEventPropagation(event);
                      handlePointerDown(event);
                    }}
                    on:mousedown={stopEventPropagation}
                    onClick={(event) => {
                      setIsCopyAllTooltipVisible(false);
                      handleCopyAll(event);
                    }}
                    {...createFreezeHandlers(setIsCopyAllTooltipVisible, {
                      onHoverChange: (isHovered) =>
                        props.onCopyAllHover?.(isHovered),
                      shouldFreezeInteractions: false,
                      safePolygonTargets: () =>
                        props.isHistoryDropdownOpen
                          ? getSafePolygonTargets(
                              "[data-react-grab-history-dropdown]",
                              "[data-react-grab-toolbar-history]",
                            )
                          : null,
                    })}
                  >
                    <IconCopy
                      size={14}
                      class="text-[#B3B3B3] transition-colors"
                    />
                  </button>
                  <Tooltip
                    visible={isCopyAllTooltipVisible() && isTooltipAllowed()}
                    position={tooltipPosition()}
                  >
                    Copy all
                  </Tooltip>
                </div>
              </div>
              <div
                class={cn(
                  "grid",
                  !isRapidRetoggle() && gridTransitionClass(),
                  expandGridClass(
                    Boolean(props.enabled) && hasToolbarActions(),
                    "pointer-events-none",
                  ),
                )}
              >
                <div
                  class={cn("relative overflow-visible", minDimensionClass())}
                >
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-toolbar-menu
                    aria-label={
                      props.isMenuOpen
                        ? "Close more actions menu"
                        : "Open more actions menu"
                    }
                    aria-haspopup="menu"
                    aria-expanded={Boolean(props.isMenuOpen)}
                    class={cn(
                      "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                      buttonSpacingClass(),
                      hitboxConstraintClass(),
                    )}
                    on:pointerdown={(event) => {
                      stopEventPropagation(event);
                      handlePointerDown(event);
                    }}
                    on:mousedown={stopEventPropagation}
                    onClick={(event) => {
                      setIsMenuTooltipVisible(false);
                      handleToggleMenu(event);
                    }}
                    {...createFreezeHandlers(
                      (visible) => {
                        if (visible && props.isMenuOpen) return;
                        setIsMenuTooltipVisible(visible);
                      },
                      { shouldFreezeInteractions: false },
                    )}
                  >
                    <IconEllipsis
                      size={14}
                      class={cn(
                        "transition-colors",
                        props.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]",
                      )}
                    />
                  </button>
                  <Tooltip
                    visible={isMenuTooltipVisible() && isTooltipAllowed()}
                    position={tooltipPosition()}
                  >
                    More actions
                  </Tooltip>
                </div>
              </div>
            </div>
            <div class="relative shrink-0 overflow-visible">
              <button
                data-react-grab-ignore-events
                data-react-grab-toolbar-enabled
                aria-label={
                  props.enabled ? "Disable React Grab" : "Enable React Grab"
                }
                aria-pressed={Boolean(props.enabled)}
                class={cn(
                  "contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none",
                  isVertical() ? "my-0.5" : "mx-0.5",
                )}
                onClick={(event) => {
                  setIsToggleTooltipVisible(false);
                  handleToggleEnabled(event);
                }}
                onMouseEnter={() => setIsToggleTooltipVisible(true)}
                onMouseLeave={() => setIsToggleTooltipVisible(false)}
              >
                <div
                  class={cn(
                    "relative rounded-full transition-colors",
                    isVertical() ? "w-3.5 h-2.5" : "w-5 h-3",
                    props.enabled ? "bg-black" : "bg-black/25",
                  )}
                >
                  <div
                    class={cn(
                      "absolute top-0.5 rounded-full bg-white transition-transform",
                      isVertical() ? "w-1.5 h-1.5" : "w-2 h-2",
                      !props.enabled && "left-0.5",
                      props.enabled && (isVertical() ? "left-1.5" : "left-2.5"),
                    )}
                  />
                </div>
              </button>
              <Tooltip
                visible={isToggleTooltipVisible() && isTooltipAllowed()}
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
          aria-label={isCollapsed() ? "Expand toolbar" : "Collapse toolbar"}
          class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale"
          onClick={handleToggleCollapse}
        >
          <IconChevron
            size={14}
            class={cn(
              "text-[#B3B3B3] transition-transform duration-150",
              chevronRotation(),
            )}
          />
        </button>
        <Show when={isShakeTooltipVisible()}>
          <div
            class={cn(
              "absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [corner-shape:superellipse(1.25)]",
              PANEL_STYLES,
              shakeTooltipPositionClass(),
            )}
            style={{ "z-index": "2147483647" }}
          >
            Enable to continue
          </div>
        </Show>
      </div>
    </div>
  );
};
