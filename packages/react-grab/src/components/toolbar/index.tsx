import { createSignal, createEffect, on, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { Position } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { loadToolbarState, saveToolbarState, type SnapEdge, type ToolbarState } from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
import {
  TOOLBAR_SNAP_MARGIN_PX,
  TOOLBAR_FADE_IN_DELAY_MS,
  TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
  TOOLBAR_DEFAULT_WIDTH_PX,
  TOOLBAR_DEFAULT_HEIGHT_PX,
  TOOLBAR_DEFAULT_POSITION_RATIO,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import { freezeUpdates } from "../../utils/freeze-updates.js";
import { freezeGlobalAnimations, unfreezeGlobalAnimations } from "../../utils/freeze-animations.js";
import { freezePseudoStates, unfreezePseudoStates } from "../../utils/freeze-pseudo-states.js";
import { getButtonSpacingClass } from "../../utils/toolbar-layout.js";
import { ToolbarContent } from "./toolbar-content.js";
import { getVisualViewport } from "../../utils/get-visual-viewport.js";
import {
  calculateExpandedPositionFromCollapsed,
  getCollapsedDimsForEdge,
  getCollapsedPosition,
  getPositionFromEdgeAndRatio,
  getRatioFromPosition,
  isHorizontalEdge,
} from "../../utils/toolbar-position.js";
import { createToolbarDrag } from "../../utils/create-toolbar-drag.js";

interface ToolbarProps {
  isActive?: boolean;
  isContextMenuOpen?: boolean;
  onToggle?: () => void;
  enabled?: boolean;
  shakeCount?: number;
  onStateChange?: (state: ToolbarState) => void;
  onSubscribeToStateChanges?: (callback: (state: ToolbarState) => void) => () => void;
  onSelectHoverChange?: (isHovered: boolean) => void;
  onContainerRef?: (element: HTMLDivElement) => void;
  onToggleToolbarMenu?: () => void;
}

interface FreezeHandlersOptions {
  shouldFreezeInteractions?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let unfreezeUpdatesCallback: (() => void) | null = null;

  const savedState = loadToolbarState();

  const [isVisible, setIsVisible] = createSignal(false);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>(savedState?.edge ?? "bottom");
  const [positionRatio, setPositionRatio] = createSignal(
    savedState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
  );
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isShaking, setIsShaking] = createSignal(false);
  const [isCollapseAnimating, setIsCollapseAnimating] = createSignal(false);
  const [isChevronPressed, setIsChevronPressed] = createSignal(false);
  const [isToolbarHovered, setIsToolbarHovered] = createSignal(false);
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
      syncCollapsedDimensionsToEdge(snapEdge(), edge);
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
        enabled: !isCollapsed(),
      });
    },
  });

  const isVertical = () => snapEdge() === "left" || snapEdge() === "right";

  const buttonSpacingClass = () => getButtonSpacingClass(isVertical());

  const stopEventPropagation = (event: Event) => {
    event.stopImmediatePropagation();
  };

  const createFreezeHandlers = (options?: FreezeHandlersOptions) => ({
    onMouseEnter: (event: MouseEvent) => {
      if (drag.isDragging()) return;
      if (options?.shouldFreezeInteractions !== false && !unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback = freezeUpdates();
        freezeGlobalAnimations();
        freezePseudoStates(event.clientX, event.clientY);
      }
      options?.onHoverChange?.(true);
    },
    onMouseLeave: () => {
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
      options?.onHoverChange?.(false);
    },
  });

  createEffect(
    on(
      () => props.shakeCount,
      (count) => {
        if (count && !props.enabled) {
          setIsShaking(true);
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

  let expandedDimensions = {
    width: TOOLBAR_DEFAULT_WIDTH_PX,
    height: TOOLBAR_DEFAULT_HEIGHT_PX,
  };
  const [collapsedDimensions, setCollapsedDimensions] = createSignal(
    getCollapsedDimsForEdge(snapEdge()),
  );

  const syncCollapsedDimensionsToEdge = (oldEdge: SnapEdge, newEdge: SnapEdge): void => {
    if (isHorizontalEdge(oldEdge) === isHorizontalEdge(newEdge)) return;
    setCollapsedDimensions(getCollapsedDimsForEdge(newEdge));
  };

  const getExpandedFromCollapsed = (
    collapsedPosition: Position,
    edge: SnapEdge,
  ): { position: Position; ratio: number } => {
    const actualRect = containerRef?.getBoundingClientRect();
    const fallback = getCollapsedDimsForEdge(edge);
    return calculateExpandedPositionFromCollapsed(
      collapsedPosition,
      edge,
      expandedDimensions,
      actualRect?.width ?? fallback.width,
      actualRect?.height ?? fallback.height,
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

  const handleToggleCollapse = drag.createDragAwareHandler(() => {
    const rect = containerRef?.getBoundingClientRect();
    const wasCollapsed = isCollapsed();
    let newRatio = positionRatio();

    if (wasCollapsed) {
      const { position: newPos, ratio } = getExpandedFromCollapsed(currentPosition(), snapEdge());
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
      enabled: wasCollapsed,
    });

    if (collapseAnimationTimeout) {
      clearTimeout(collapseAnimationTimeout);
    }
    collapseAnimationTimeout = setTimeout(() => {
      setIsCollapseAnimating(false);
      captureDimensionsAfterAnimation();
    }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
  });

  const computeCollapsedPosition = (): Position =>
    getCollapsedPosition(snapEdge(), position(), expandedDimensions, collapsedDimensions());

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  let collapseAnimationTimeout: ReturnType<typeof setTimeout> | undefined;

  let lastObservedExpandedSize: { width: number; height: number } | null = null;

  // Both directions need to refresh their cached dimensions: collapsing
  // updates collapsedDimensions for the next expand-from-collapsed offset
  // calculation, and expanding updates expandedDimensions so handleResize
  // and getExpandedFromCollapsed don't keep using the 78x28 default that
  // got cached when the toolbar mounted with savedState.collapsed=true and
  // an unmeasurable rect.
  const captureDimensionsAfterAnimation = () => {
    const finalRect = containerRef?.getBoundingClientRect();
    if (!finalRect || finalRect.width === 0 || finalRect.height === 0) return;
    if (isCollapsed()) {
      setCollapsedDimensions({ width: finalRect.width, height: finalRect.height });
    } else {
      expandedDimensions = { width: finalRect.width, height: finalRect.height };
      lastObservedExpandedSize = { width: finalRect.width, height: finalRect.height };
    }
  };

  // The first onMount measurement can fire before the shadow DOM host is
  // attached to <body> (mountRoot defers attachment to DOMContentLoaded while
  // the renderer's dynamic import can resolve earlier), or before fonts/CSS
  // have settled - both leave getBoundingClientRect returning a 0 rect. The
  // observer adopts the real size once layout commits and re-anchors the
  // toolbar to its saved/default ratio so it lands on the correct edge slot
  // instead of the off-screen position derived from a 0-width measurement.
  const handleObservedSizeChange = (newWidth: number, newHeight: number) => {
    if (newWidth === 0 || newHeight === 0) return;
    if (drag.isDragging() || drag.isSnapping()) return;
    if (isCollapseAnimating()) return;

    if (isCollapsed()) {
      const currentCollapsed = collapsedDimensions();
      if (currentCollapsed.width === newWidth && currentCollapsed.height === newHeight) return;
      setCollapsedDimensions({ width: newWidth, height: newHeight });
      return;
    }

    if (
      lastObservedExpandedSize &&
      lastObservedExpandedSize.width === newWidth &&
      lastObservedExpandedSize.height === newHeight
    ) {
      return;
    }
    lastObservedExpandedSize = { width: newWidth, height: newHeight };
    expandedDimensions = { width: newWidth, height: newHeight };
    setPosition(getPositionFromEdgeAndRatio(snapEdge(), positionRatio(), newWidth, newHeight));
  };

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
        enabled: !isCollapsed(),
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
    // The host's shadow DOM may still be detached from <body> when this
    // synchronous measurement runs (mountRoot defers attachment to
    // DOMContentLoaded, the renderer's dynamic import can resolve earlier).
    // A detached element returns a 0 rect, which would poison
    // expandedDimensions and place the toolbar off-screen. The ResizeObserver
    // installed below adopts the real size as soon as layout commits.
    const hasMeasurableRect = Boolean(rect && rect.width > 0 && rect.height > 0);

    // Because isCollapsed defaults to false the element is always rendered
    // expanded on initial mount, so rect reflects expanded dimensions here
    // regardless of savedState.collapsed. Using it for collapsed dimensions
    // would make the toolbar too wide after restoring a collapsed state.
    if (savedState) {
      if (hasMeasurableRect && rect) {
        expandedDimensions = { width: rect.width, height: rect.height };
      }
      setIsCollapsed(savedState.collapsed);
      const newPosition = getPositionFromEdgeAndRatio(
        savedState.edge,
        savedState.ratio,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(newPosition);
    } else if (hasMeasurableRect && rect) {
      expandedDimensions = { width: rect.width, height: rect.height };
      setPosition({
        x: viewport.offsetLeft + (viewport.width - rect.width) / 2,
        y: viewport.offsetTop + viewport.height - rect.height - TOOLBAR_SNAP_MARGIN_PX,
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
      setPositionRatio(TOOLBAR_DEFAULT_POSITION_RATIO);
    }

    if (props.onSubscribeToStateChanges) {
      const unsubscribe = props.onSubscribeToStateChanges((state: ToolbarState) => {
        if (isCollapseAnimating()) return;

        const rect = containerRef?.getBoundingClientRect();
        if (!rect) return;

        const didCollapsedChange = isCollapsed() !== state.collapsed;

        syncCollapsedDimensionsToEdge(snapEdge(), state.edge);
        setSnapEdge(state.edge);

        if (didCollapsedChange && !state.collapsed) {
          const collapsedPos = currentPosition();
          setIsCollapseAnimating(true);
          setIsCollapsed(state.collapsed);
          const { position: newPos, ratio: newRatio } = getExpandedFromCollapsed(
            collapsedPos,
            state.edge,
          );
          setPosition(newPos);
          setPositionRatio(newRatio);
          clearTimeout(collapseAnimationTimeout);
          collapseAnimationTimeout = setTimeout(() => {
            setIsCollapseAnimating(false);
            captureDimensionsAfterAnimation();
          }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
        } else {
          if (didCollapsedChange) {
            setIsCollapseAnimating(true);
            clearTimeout(collapseAnimationTimeout);
            collapseAnimationTimeout = setTimeout(() => {
              setIsCollapseAnimating(false);
              captureDimensionsAfterAnimation();
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

      onCleanup(unsubscribe);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);

    if (typeof ResizeObserver !== "undefined" && containerRef) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        // entry.contentRect reports content-box, which omits padding; the rest
        // of the toolbar measures border-box via getBoundingClientRect, so
        // mixing them would underestimate the toolbar by its `px-2 py-1.5`
        // padding. borderBoxSize is widely supported (Chrome 84+, Safari 15.4+,
        // Firefox 69+); fall back to getBoundingClientRect for older runtimes.
        const borderBox = entry.borderBoxSize?.[0];
        let width: number;
        let height: number;
        if (borderBox) {
          width = borderBox.inlineSize;
          height = borderBox.blockSize;
        } else {
          const rect = containerRef?.getBoundingClientRect();
          if (!rect) return;
          width = rect.width;
          height = rect.height;
        }
        handleObservedSizeChange(width, height);
      });
      observer.observe(containerRef);
      onCleanup(() => observer.disconnect());
    }

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
    clearTimeout(resizeTimeout);
    clearTimeout(collapseAnimationTimeout);

    unfreezeUpdatesCallback?.();
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

  const isInteracting = (): boolean =>
    isToolbarHovered() ||
    Boolean(props.isContextMenuOpen) ||
    drag.isDragging() ||
    drag.isSnapping() ||
    isCollapseAnimating() ||
    isChevronPressed();

  const shouldDim = (): boolean => Boolean(props.isActive) && !isInteracting();

  const getTransitionClass = (): string => {
    // Drag must follow the pointer frame-to-frame; any transform transition
    // here would lag the toolbar behind the cursor.
    if (isResizing() || drag.isDragging()) {
      return "";
    }
    if (drag.isSnapping()) {
      return "transition-[transform,opacity] duration-300 ease-out";
    }
    if (isCollapseAnimating()) {
      const duration = isCollapsed() ? "duration-140" : "duration-220";
      return `transition-[transform,opacity] ${duration} ease-drawer`;
    }
    return "transition-[transform,opacity] duration-400 ease-drawer";
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
        // freeze-pseudo-states sets `html { pointer-events: none !important }`
        // during grab; the toolbar must opt back in to stay clickable.
        isVisible() ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{
        "z-index": String(Z_INDEX_OVERLAY),
        transform: `translate(${currentPosition().x}px, ${currentPosition().y}px) scale(${shouldDim() ? 0.97 : 1})`,
        "transform-origin": getTransformOrigin(),
        opacity: !isVisible() ? 0 : shouldDim() ? 0.55 : 1,
      }}
      on:pointerdown={(event) => {
        stopEventPropagation(event);
        drag.handlePointerDown(event);
      }}
      on:mousedown={stopEventPropagation}
      onMouseEnter={() => {
        setIsToolbarHovered(true);
        if (!isCollapsed()) props.onSelectHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setIsToolbarHovered(false);
        props.onSelectHoverChange?.(false);
      }}
    >
      <ToolbarContent
        isCollapsed={isCollapsed()}
        snapEdge={snapEdge()}
        isShaking={isShaking()}
        isChevronPressed={isChevronPressed()}
        transformOrigin={getTransformOrigin()}
        onAnimationEnd={() => setIsShaking(false)}
        onCollapseClick={handleToggleCollapse}
        onCollapsePointerDown={() => setIsChevronPressed(true)}
        onCollapsePointerUp={() => setIsChevronPressed(false)}
        onCollapsePointerLeave={() => setIsChevronPressed(false)}
        onPanelClick={(event) => {
          if (isCollapsed()) {
            event.stopPropagation();
            const { position: newPos, ratio: newRatio } = getExpandedFromCollapsed(
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
              enabled: true,
            });
            if (collapseAnimationTimeout) {
              clearTimeout(collapseAnimationTimeout);
            }
            collapseAnimationTimeout = setTimeout(() => {
              setIsCollapseAnimating(false);
              captureDimensionsAfterAnimation();
            }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
          }
        }}
        selectButton={
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-toggle
            aria-label={props.isActive ? "Stop selecting element" : "Select element"}
            aria-pressed={Boolean(props.isActive)}
            class={cn(
              "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
              buttonSpacingClass(),
            )}
            onClick={handleToggle}
            on:contextmenu={(event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              props.onToggleToolbarMenu?.();
            }}
            {...createFreezeHandlers()}
          >
            <IconSelect
              size={14}
              class={cn(
                "transition-colors",
                props.isActive
                  ? "text-[var(--rg-text-primary)]"
                  : "text-[var(--rg-text-secondary)]",
              )}
            />
          </button>
        }
      />
    </div>
  );
};
