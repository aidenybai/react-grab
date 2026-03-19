import {
  createSignal,
  createEffect,
  onSettled,
  onCleanup,
  Show,
} from "solid-js";
import type { Component } from "solid-js";
import type { Position, ToolbarMenuAction } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import {
  loadToolbarState,
  saveToolbarState,
  type SnapEdge,
  type ToolbarState,
} from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
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
  TOOLBAR_COLLAPSED_SHORT_PX,
  TOOLBAR_COLLAPSED_LONG_PX,
  TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
  TOGGLE_ANIMATION_BUFFER_MS,
  TOOLBAR_DEFAULT_WIDTH_PX,
  TOOLBAR_DEFAULT_HEIGHT_PX,
  TOOLBAR_DEFAULT_POSITION_RATIO,
  TOOLBAR_SHAKE_TOOLTIP_DURATION_MS,
  FEEDBACK_DURATION_MS,
  HINT_FLIP_IN_ANIMATION,
  SAFE_POLYGON_BUFFER_PX,
  SELECTION_HINT_COUNT,
  SELECTION_HINT_CYCLE_INTERVAL_MS,
  Z_INDEX_HOST,
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
import { Kbd } from "../kbd.jsx";
import {
  getButtonSpacingClass,
  getHitboxConstraintClass,
} from "../../utils/toolbar-layout.js";
import { ToolbarContent } from "./toolbar-content.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";
import { getVisualViewport } from "../../utils/get-visual-viewport.js";
import {
  calculateExpandedPositionFromCollapsed,
  clampToRange,
  getCollapsedPosition,
  getPositionFromEdgeAndRatio,
  getRatioFromPosition,
} from "../../utils/toolbar-position.js";
import { createToolbarDrag } from "../../utils/create-toolbar-drag.js";

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
  const [isResizing, setIsResizing] = createSignal(false);
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>(
    savedState?.edge ?? "bottom",
  );
  const [positionRatio, setPositionRatio] = createSignal(
    savedState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
  );
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
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
  const [selectionHintIndex, setSelectionHintIndex] = createSignal(0);
  const [hasHintCycled, setHasHintCycled] = createSignal(false);
  const drag = createToolbarDrag({
    getContainerRef: () => containerRef,
    isCollapsed,
    getExpandedDimensions: () => expandedDimensions,
    onDragStart: () => {
      if (unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback();
        unfreezeUpdatesCallback = null;
        unfreezeGlobalAnimations();
        unfreezePseudoStates();
      }
    },
    onPositionUpdate: (newPosition) => setPosition(newPosition),
    onSnapEdgeChange: (edge, ratio) => {
      setSnapEdge(edge);
      setPositionRatio(ratio);
    },
    onSnapComplete: (result) => {
      expandedDimensions = result.expandedDimensions;
      setPosition(result.position);
      saveAndNotify({
        edge: result.edge,
        ratio: result.ratio,
        collapsed: isCollapsed(),
        enabled: props.enabled ?? true,
      });
    },
    onSnapAnimationEnd: () => {
      if (props.enabled) {
        measureExpandableDimension();
      }
    },
  });

  const hasLearnedSelectionHints = () => (props.clockFlashTrigger ?? 0) > 0;

  createEffect(
    () => [props.isActive, hasLearnedSelectionHints()] as const,
    ([isActive, hasLearned]) => {
      setSelectionHintIndex(0);
      setHasHintCycled(false);
      if (!isActive || hasLearned) return;
      const intervalId = setInterval(() => {
        if (!hasHintCycled()) setHasHintCycled(true);
        setSelectionHintIndex(
          (previousIndex) => (previousIndex + 1) % SELECTION_HINT_COUNT,
        );
      }, SELECTION_HINT_CYCLE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    },
    undefined,
    { defer: true },
  );

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

  const buttonSpacingClass = () => getButtonSpacingClass(isVertical());
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
      if (drag.isDragging()) return;
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

  let shakeTooltipTimeout: ReturnType<typeof setTimeout> | undefined;
  const clearShakeTooltipTimeout = () => {
    if (shakeTooltipTimeout !== undefined) {
      clearTimeout(shakeTooltipTimeout);
      shakeTooltipTimeout = undefined;
    }
  };

  createEffect(
    () => props.shakeCount,
    (count) => {
      if (count && !props.enabled) {
        setIsShaking(true);
        setIsShakeTooltipVisible(true);

        clearShakeTooltipTimeout();
        shakeTooltipTimeout = setTimeout(() => {
          setIsShakeTooltipVisible(false);
        }, TOOLBAR_SHAKE_TOOLTIP_DURATION_MS);
        return () => clearShakeTooltipTimeout();
      }
    },
  );

  createEffect(
    () => props.enabled,
    (enabled) => {
      if (enabled && isShakeTooltipVisible()) {
        setIsShakeTooltipVisible(false);
        clearShakeTooltipTimeout();
      }
    },
  );

  createEffect(
    () => [props.isActive, props.isContextMenuOpen] as const,
    ([isActive, isContextMenuOpen]) => {
      if (!isActive && !isContextMenuOpen && unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback();
        unfreezeUpdatesCallback = null;
      }
    },
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
      clampedX = clampToRange(currentPos.x, minX, maxX);
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
      clampedY = clampToRange(currentPos.y, minY, maxY);
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
      return () => {
        clearTimeout(timerId);
        setIsHistoryTooltipVisible(false);
      };
    },
    undefined,
    { defer: true },
  );

  createEffect(
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
      return () => {
        if (historyItemCountTimeout) {
          clearTimeout(historyItemCountTimeout);
        }
      };
    },
    undefined,
    { defer: true },
  );

  let expandedDimensions = {
    width: TOOLBAR_DEFAULT_WIDTH_PX,
    height: TOOLBAR_DEFAULT_HEIGHT_PX,
  };
  const [collapsedDimensions, setCollapsedDimensions] = createSignal({
    width: TOOLBAR_COLLAPSED_SHORT_PX,
    height: TOOLBAR_COLLAPSED_SHORT_PX,
  });

  const getExpandedFromCollapsed = (
    collapsedPosition: Position,
    edge: SnapEdge,
  ): { position: Position; ratio: number } => {
    const actualRect = containerRef?.getBoundingClientRect();
    const actualCollapsedWidth =
      actualRect?.width ?? TOOLBAR_COLLAPSED_SHORT_PX;
    const actualCollapsedHeight =
      actualRect?.height ?? TOOLBAR_COLLAPSED_SHORT_PX;
    return calculateExpandedPositionFromCollapsed(
      collapsedPosition,
      edge,
      expandedDimensions,
      actualCollapsedWidth,
      actualCollapsedHeight,
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

  const handleToggle = drag.createDragAwareHandler(() => props.onToggle?.());

  const handleHistory = drag.createDragAwareHandler(() =>
    props.onToggleHistory?.(),
  );

  const handleCopyAll = drag.createDragAwareHandler(() => props.onCopyAll?.());

  const handleToggleMenu = drag.createDragAwareHandler(() =>
    props.onToggleMenu?.(),
  );

  const handleToggleCollapse = drag.createDragAwareHandler(() => {
    const rect = containerRef?.getBoundingClientRect();
    const wasCollapsed = isCollapsed();
    let newRatio = positionRatio();

    if (wasCollapsed) {
      const { position: newPos, ratio } = getExpandedFromCollapsed(
        currentPosition(),
        snapEdge(),
      );
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

  const handleToggleEnabled = drag.createDragAwareHandler(() => {
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

      const computeClampedPosition = (expandDimension: number): Position => {
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
            y: clampToRange(targetAxisPosition, clampMin, clampMax),
          };
        }
        const clampMin = viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX;
        const clampMax =
          viewport.offsetLeft +
          viewport.width -
          expandedDimensions.width -
          TOOLBAR_SNAP_MARGIN_PX;
        return {
          x: clampToRange(targetAxisPosition, clampMin, clampMax),
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

  const computeCollapsedPosition = (): Position =>
    getCollapsedPosition(
      snapEdge(),
      position(),
      expandedDimensions,
      collapsedDimensions(),
    );

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  let collapseAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let toggleAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let toggleAnimationRafId: number | undefined;
  let historyItemCountTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleResize = () => {
    if (drag.isDragging()) return;

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

  onSettled(() => {
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
      setPositionRatio(TOOLBAR_DEFAULT_POSITION_RATIO);
    } else {
      const defaultPosition = getPositionFromEdgeAndRatio(
        "bottom",
        TOOLBAR_DEFAULT_POSITION_RATIO,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(defaultPosition);
    }

    if (props.enabled) {
      measureExpandableDimension();
    }

    let unsubscribe: (() => void) | undefined;
    if (props.onSubscribeToStateChanges) {
      unsubscribe = props.onSubscribeToStateChanges((state: ToolbarState) => {
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
            getExpandedFromCollapsed(collapsedPos, state.edge);
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
      });
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);

    const fadeInTimeout = setTimeout(() => {
      setIsVisible(true);
    }, TOOLBAR_FADE_IN_DELAY_MS);

    return () => {
      clearTimeout(fadeInTimeout);
      unsubscribe?.();
    };
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("scroll", handleResize);
    clearTimeout(resizeTimeout);
    clearTimeout(collapseAnimationTimeout);
    clearShakeTooltipTimeout();
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
    return collapsed ? computeCollapsedPosition() : position();
  };

  const getCursorClass = (): string => {
    if (isCollapsed()) {
      return "cursor-pointer";
    }
    if (drag.isDragging()) {
      return "cursor-grabbing";
    }
    return "cursor-grab";
  };

  const getTransitionClass = (): string => {
    if (isResizing()) {
      return "";
    }
    if (drag.isSnapping()) {
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
        "fixed left-0 top-0 font-sans text-[13px] antialiased select-none",
        getCursorClass(),
        getTransitionClass(),
        isVisible()
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
      style={{
        "z-index": String(Z_INDEX_HOST),
        transform: `translate(${currentPosition().x}px, ${
          currentPosition().y
        }px)`,
        "transform-origin": getTransformOrigin(),
      }}
      on:pointerdown={(event) => {
        stopEventPropagation(event);
        drag.handlePointerDown(event);
      }}
      on:mousedown={stopEventPropagation}
      onMouseEnter={() => !isCollapsed() && props.onSelectHoverChange?.(true)}
      onMouseLeave={() => props.onSelectHoverChange?.(false)}
    >
      <ToolbarContent
        isActive={props.isActive}
        enabled={props.enabled}
        isCollapsed={isCollapsed()}
        snapEdge={snapEdge()}
        isShaking={isShaking()}
        isHistoryExpanded={(props.historyItemCount ?? 0) > 0}
        isCopyAllExpanded={Boolean(props.isHistoryDropdownOpen)}
        isMenuExpanded={hasToolbarActions()}
        isMenuOpen={props.isMenuOpen}
        isHistoryPinned={props.isHistoryPinned}
        disableGridTransitions={isRapidRetoggle()}
        transformOrigin={getTransformOrigin()}
        onAnimationEnd={() => setIsShaking(false)}
        onCollapseClick={handleToggleCollapse}
        onExpandableButtonsRef={(element) => {
          expandableButtonsRef = element;
        }}
        onPanelClick={(event) => {
          if (isCollapsed()) {
            event.stopPropagation();
            const { position: newPos, ratio: newRatio } =
              getExpandedFromCollapsed(currentPosition(), snapEdge());
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
        selectButton={
          <>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-toggle
              aria-label={
                props.isActive ? "Stop selecting element" : "Select element"
              }
              aria-pressed={props.isActive ? "true" : "false"}
              class={cn(
                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                buttonSpacingClass(),
                hitboxConstraintClass(),
              )}
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
              Select element <Kbd>{formatShortcut("C")}</Kbd>
            </Tooltip>
          </>
        }
        historyButton={
          <>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-history
              aria-label={`Open history${
                (props.historyItemCount ?? 0) > 0
                  ? ` (${props.historyItemCount ?? 0} items)`
                  : ""
              }`}
              aria-haspopup="menu"
              aria-expanded={props.isHistoryDropdownOpen ? "true" : "false"}
              class={cn(
                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                buttonSpacingClass(),
                hitboxConstraintClass(),
              )}
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
                <Show
                  when={
                    props.hasUnreadHistoryItems &&
                    (props.historyItemCount ?? 0) > 0
                  }
                >
                  <span
                    data-react-grab-unread-indicator
                    class="absolute -top-1 -right-1 min-w-2.5 h-2.5 px-0.5 flex items-center justify-center rounded-full bg-black text-white text-[8px] font-semibold leading-none"
                  >
                    {props.historyItemCount}
                  </span>
                </Show>
              </span>
            </button>
            <Tooltip
              visible={isHistoryTooltipVisible() && isTooltipAllowed()}
              position={tooltipPosition()}
            >
              {historyTooltipLabel()}
            </Tooltip>
          </>
        }
        copyAllButton={
          <>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-copy-all
              aria-label="Copy all history items"
              class={cn(
                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                buttonSpacingClass(),
                hitboxConstraintClass(),
              )}
              onClick={(event) => {
                setIsCopyAllTooltipVisible(false);
                handleCopyAll(event);
              }}
              {...createFreezeHandlers(setIsCopyAllTooltipVisible, {
                onHoverChange: (isHovered) => props.onCopyAllHover?.(isHovered),
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
              <IconCopy size={14} class="text-[#B3B3B3] transition-colors" />
            </button>
            <Tooltip
              visible={isCopyAllTooltipVisible() && isTooltipAllowed()}
              position={tooltipPosition()}
            >
              Copy all
            </Tooltip>
          </>
        }
        menuButton={
          <>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-menu
              aria-label={
                props.isMenuOpen
                  ? "Close more actions menu"
                  : "Open more actions menu"
              }
              aria-haspopup="menu"
              aria-expanded={props.isMenuOpen ? "true" : "false"}
              class={cn(
                "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
                buttonSpacingClass(),
                hitboxConstraintClass(),
              )}
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
          </>
        }
        toggleButton={
          <>
            <button
              data-react-grab-ignore-events
              data-react-grab-toolbar-enabled
              aria-label={
                props.enabled ? "Disable React Grab" : "Enable React Grab"
              }
              aria-pressed={props.enabled ? "true" : "false"}
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
          </>
        }
        shakeTooltip={
          <>
            <Show when={props.isActive && !hasLearnedSelectionHints()}>
              <div
                class={cn(
                  "absolute whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [animation-fill-mode:backwards] overflow-hidden [corner-shape:superellipse(1.25)]",
                  "bg-white",
                  shakeTooltipPositionClass(),
                )}
                style={{ "z-index": String(Z_INDEX_HOST) }}
              >
                <Show when={selectionHintIndex() === 0}>
                  <span
                    class={cn(
                      "flex items-center gap-1",
                      hasHintCycled() && HINT_FLIP_IN_ANIMATION,
                    )}
                  >
                    Click or
                    <Kbd>↵</Kbd>
                    to capture
                  </span>
                </Show>
                <Show when={selectionHintIndex() === 1}>
                  <span
                    class={cn(
                      "flex items-center gap-1",
                      HINT_FLIP_IN_ANIMATION,
                    )}
                  >
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    to fine-tune target
                  </span>
                </Show>
                <Show when={selectionHintIndex() === 2}>
                  <span
                    class={cn(
                      "flex items-center gap-1",
                      HINT_FLIP_IN_ANIMATION,
                    )}
                  >
                    <Kbd>esc</Kbd>
                    to cancel
                  </span>
                </Show>
              </div>
            </Show>
            <Show when={isShakeTooltipVisible()}>
              <div
                class={cn(
                  "absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [corner-shape:superellipse(1.25)]",
                  "bg-white",
                  shakeTooltipPositionClass(),
                )}
                style={{ "z-index": String(Z_INDEX_HOST) }}
              >
                Enable to continue
              </div>
            </Show>
          </>
        }
      />
    </div>
  );
};
