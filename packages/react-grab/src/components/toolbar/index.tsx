import { createSignal, createEffect, on, onMount, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import type { Position } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { loadToolbarState, saveToolbarState, type SnapEdge, type ToolbarState } from "./state.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconComment } from "../icons/icon-comment.jsx";
import { IconCopy } from "../icons/icon-copy.jsx";
import { createSafePolygonTracker, type TargetRect } from "../../utils/safe-polygon.js";
import {
  TOOLBAR_SNAP_MARGIN_PX,
  TOOLBAR_FADE_IN_DELAY_MS,
  TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
  TOOLBAR_DEFAULT_WIDTH_PX,
  TOOLBAR_DEFAULT_HEIGHT_PX,
  TOOLBAR_DEFAULT_POSITION_RATIO,
  FEEDBACK_DURATION_MS,
  SAFE_POLYGON_BUFFER_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import { freezeUpdates } from "../../utils/freeze-updates.js";
import { freezeGlobalAnimations, unfreezeGlobalAnimations } from "../../utils/freeze-animations.js";
import { freezePseudoStates, unfreezePseudoStates } from "../../utils/freeze-pseudo-states.js";
import { getButtonSpacingClass, getHitboxConstraintClass } from "../../utils/toolbar-layout.js";
import { ToolbarContent } from "./toolbar-content.js";
import { nativeRequestAnimationFrame } from "../../utils/native-raf.js";
import { getVisualViewport } from "../../utils/get-visual-viewport.js";
import {
  calculateExpandedPositionFromCollapsed,
  clampToRange,
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
  commentItemCount?: number;
  clockFlashTrigger?: number;
  onToggleComments?: () => void;
  onCopyAll?: () => void;
  onCopyAllHover?: (isHovered: boolean) => void;
  onCommentsButtonHover?: (isHovered: boolean) => void;
  isCommentsDropdownOpen?: boolean;
  isCommentsPinned?: boolean;
  onToggleToolbarMenu?: () => void;
}

interface FreezeHandlersOptions {
  shouldFreezeInteractions?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
  safePolygonTargets?: () => TargetRect[] | null;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let unfreezeUpdatesCallback: (() => void) | null = null;

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

  const getSafePolygonTargets = (...selectors: string[]): TargetRect[] | null => {
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
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>(savedState?.edge ?? "bottom");
  const [positionRatio, setPositionRatio] = createSignal(
    savedState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
  );
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isShaking, setIsShaking] = createSignal(false);
  const [isCollapseAnimating, setIsCollapseAnimating] = createSignal(false);
  const [isChevronPressed, setIsChevronPressed] = createSignal(false);
  const [isToolbarHovered, setIsToolbarHovered] = createSignal(false);
  let clockFlashRef: HTMLSpanElement | undefined;
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

  const commentsIconClass = () =>
    cn("transition-colors", props.isCommentsPinned ? "text-black/50" : "text-[#B3B3B3]");

  const isVertical = () => snapEdge() === "left" || snapEdge() === "right";

  const buttonSpacingClass = () => getButtonSpacingClass(isVertical());
  const hitboxConstraintClass = () => getHitboxConstraintClass(isVertical());

  const stopEventPropagation = (event: Event) => {
    event.stopImmediatePropagation();
  };

  const createFreezeHandlers = (options?: FreezeHandlersOptions) => ({
    onMouseEnter: (event: MouseEvent) => {
      if (drag.isDragging()) return;
      safePolygonTracker.stop();
      if (options?.shouldFreezeInteractions !== false && !unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback = freezeUpdates();
        freezeGlobalAnimations();
        freezePseudoStates(event.clientX, event.clientY);
      }
      options?.onHoverChange?.(true);
    },
    onMouseLeave: (event: MouseEvent) => {
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
        safePolygonTracker.start({ x: event.clientX, y: event.clientY }, targetRects, () =>
          options?.onHoverChange?.(false),
        );
        return;
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
        viewport.offsetLeft + viewport.width - rect.width - TOOLBAR_SNAP_MARGIN_PX,
      );
      clampedX = clampToRange(currentPos.x, minX, maxX);
      clampedY =
        edge === "top"
          ? viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetTop + viewport.height - rect.height - TOOLBAR_SNAP_MARGIN_PX;
    } else {
      const minY = viewport.offsetTop + TOOLBAR_SNAP_MARGIN_PX;
      const maxY = Math.max(
        minY,
        viewport.offsetTop + viewport.height - rect.height - TOOLBAR_SNAP_MARGIN_PX,
      );
      clampedY = clampToRange(currentPos.y, minY, maxY);
      clampedX =
        edge === "left"
          ? viewport.offsetLeft + TOOLBAR_SNAP_MARGIN_PX
          : viewport.offsetLeft + viewport.width - rect.width - TOOLBAR_SNAP_MARGIN_PX;
    }

    const newRatio = getRatioFromPosition(edge, clampedX, clampedY, rect.width, rect.height);
    setPositionRatio(newRatio);

    const didPositionChange = clampedX !== currentPos.x || clampedY !== currentPos.y;
    // Two nested rAFs defer setPosition until the browser has committed
    // layout and paint from the preceding collapse/expand, which prevents
    // a visible jump where the toolbar briefly appears at its old position
    // before snapping to the new clamped coordinates.
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
        if (props.isCommentsDropdownOpen) return;
        if (clockFlashRef) {
          clockFlashRef.classList.remove("animate-clock-flash");
          // Reading offsetHeight forces a reflow between the class removal
          // and re-addition, which restarts the CSS animation. Without it
          // the browser would batch both operations as a no-op.
          void clockFlashRef.offsetHeight;
          clockFlashRef.classList.add("animate-clock-flash");
        }
        const timerId = setTimeout(() => {
          clockFlashRef?.classList.remove("animate-clock-flash");
        }, FEEDBACK_DURATION_MS);
        onCleanup(() => {
          clearTimeout(timerId);
        });
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.commentItemCount ?? 0,
      () => {
        if (isCollapsed()) return;
        if (commentItemCountTimeout) {
          clearTimeout(commentItemCountTimeout);
        }
        commentItemCountTimeout = setTimeout(() => {
          reclampToolbarToViewport();
        }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
        onCleanup(() => {
          if (commentItemCountTimeout) {
            clearTimeout(commentItemCountTimeout);
          }
        });
      },
      { defer: true },
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

  const handleComments = drag.createDragAwareHandler(() => props.onToggleComments?.());

  const handleCopyAll = drag.createDragAwareHandler(() => props.onCopyAll?.());

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

  const computeCollapsedPosition = (): Position =>
    getCollapsedPosition(snapEdge(), position(), expandedDimensions, collapsedDimensions());

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  let collapseAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let commentItemCountTimeout: ReturnType<typeof setTimeout> | undefined;

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

    // Because isCollapsed defaults to false the element is always rendered
    // expanded on initial mount, so rect reflects expanded dimensions here
    // regardless of savedState.collapsed. Using it for collapsed dimensions
    // would make the toolbar too wide after restoring a collapsed state.
    if (savedState) {
      if (rect) {
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
    } else if (rect) {
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
    clearTimeout(resizeTimeout);
    clearTimeout(collapseAnimationTimeout);
    clearTimeout(commentItemCountTimeout);
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
        isCommentsExpanded={(props.commentItemCount ?? 0) > 0}
        isCopyAllExpanded={Boolean(props.isCommentsDropdownOpen)}
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
              class={cn("transition-colors", props.isActive ? "text-black" : "text-black/70")}
            />
          </button>
        }
        commentsButton={
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-comments
            aria-label={`Open comments${
              (props.commentItemCount ?? 0) > 0 ? ` (${props.commentItemCount ?? 0} items)` : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={Boolean(props.isCommentsDropdownOpen)}
            class={cn(
              "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
              buttonSpacingClass(),
              hitboxConstraintClass(),
            )}
            onClick={handleComments}
            {...createFreezeHandlers({
              onHoverChange: (isHovered) => props.onCommentsButtonHover?.(isHovered),
              shouldFreezeInteractions: false,
              safePolygonTargets: () =>
                props.isCommentsDropdownOpen
                  ? getSafePolygonTargets(
                      "[data-react-grab-comments-dropdown]",
                      "[data-react-grab-toolbar-copy-all]",
                    )
                  : null,
            })}
          >
            <span ref={clockFlashRef} class="inline-flex relative">
              <IconComment size={14} class={commentsIconClass()} />
              <Show when={(props.commentItemCount ?? 0) > 0}>
                <span
                  data-react-grab-unread-indicator
                  class="absolute -top-1 -right-1 min-w-2.5 h-2.5 px-0.5 flex items-center justify-center rounded-full bg-black text-white text-[8px] font-semibold leading-none"
                >
                  {props.commentItemCount}
                </span>
              </Show>
            </span>
          </button>
        }
        copyAllButton={
          <button
            data-react-grab-ignore-events
            data-react-grab-toolbar-copy-all
            aria-label="Copy all comments"
            class={cn(
              "contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox",
              hitboxConstraintClass(),
            )}
            onClick={handleCopyAll}
            {...createFreezeHandlers({
              onHoverChange: (isHovered) => props.onCopyAllHover?.(isHovered),
              shouldFreezeInteractions: false,
              safePolygonTargets: () =>
                props.isCommentsDropdownOpen
                  ? getSafePolygonTargets(
                      "[data-react-grab-comments-dropdown]",
                      "[data-react-grab-toolbar-comments]",
                    )
                  : null,
            })}
          >
            <IconCopy size={14} class="text-[#B3B3B3] transition-colors" />
          </button>
        }
      />
    </div>
  );
};
