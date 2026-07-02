import { createEffect, onCleanup } from "solid-js";
import { createMenuHighlight } from "./create-menu-highlight.js";
import { getShadowActiveElement } from "./get-shadow-active-element.js";

interface MenuListOptions {
  activeIndex: () => number;
  itemCount: () => number;
  onHoverIndex: (index: number) => void;
  isAdjusting?: () => boolean;
}

interface MenuRowHoverHandlers {
  onPointerEnter: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerLeave: () => void;
}

interface MenuListController {
  containerRef: (element: HTMLElement | undefined) => void;
  highlightRef: (element: HTMLElement) => void;
  registerItem: (index: number, element: HTMLElement | undefined) => void;
  rowHoverHandlers: (index: number) => MenuRowHoverHandlers;
  handleListPointerMove: (event: PointerEvent) => void;
  handleRowMouseDown: (event: MouseEvent) => void;
}

// Shared vertical menu navigation for the dials and style panels: the active
// row highlight follower, scroll-into-view, and pointer-hover activation. A
// stationary cursor lies about intent in two ways: (1) the mount-time reflow
// fires a phantom pointerenter on whatever row sits under the mouse before any
// real movement, and (2) keyboard navigation swapping the active row's content
// fires a phantom pointerenter on the row under the cursor, yanking the
// selection back. We track the cursor position seen on REAL pointermove events
// and ignore any enter/move whose coordinates have not changed since — the
// only events at the settled position are synthetic. The position is recorded
// on `move` only (never `enter`) so a genuine single mouse-move, which fires
// `enter` then `move` at the same coordinates, still activates via its `move`.
export const createMenuList = (options: MenuListOptions): MenuListController => {
  const itemElements: (HTMLElement | undefined)[] = [];
  let listRef: HTMLElement | undefined;
  let didPointerMove = false;
  let pendingHoverIndex: number | null = null;
  let lastPointerX = Number.NaN;
  let lastPointerY = Number.NaN;

  const isHoverOwnedByFocusedInlineInput = (): boolean => {
    if (!listRef) return false;
    const focusedElement = getShadowActiveElement(listRef);
    return (
      focusedElement instanceof HTMLElement &&
      focusedElement.matches("input[data-react-grab-input]")
    );
  };

  const isSettledPosition = (event: PointerEvent): boolean =>
    event.clientX === lastPointerX && event.clientY === lastPointerY;

  const maybeActivateHoveredIndex = (
    index: number,
    source: "enter" | "move",
    event: PointerEvent,
  ) => {
    if (source === "move") {
      if (isSettledPosition(event)) return;
      didPointerMove = true;
    } else if (!didPointerMove || isSettledPosition(event)) {
      // Enter only counts once the user has actually moved, and never at the
      // settled position — a content swap re-firing enter under the cursor is
      // exactly that phantom we must drop, or it yanks back keyboard nav.
      return;
    }
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    if (isHoverOwnedByFocusedInlineInput()) return;
    if (options.isAdjusting?.()) {
      pendingHoverIndex = index;
      return;
    }
    pendingHoverIndex = null;
    if (index === options.activeIndex()) return;
    options.onHoverIndex(index);
  };

  createEffect(() => {
    if (options.isAdjusting?.()) return;
    const index = pendingHoverIndex;
    if (index === null) return;
    pendingHoverIndex = null;
    const element = itemElements[index];
    if (!didPointerMove) return;
    if (isHoverOwnedByFocusedInlineInput()) return;
    if (!element?.matches(":hover")) return;
    if (index === options.activeIndex()) return;
    options.onHoverIndex(index);
  });

  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight({});

  createEffect(() => {
    itemElements.length = options.itemCount();
  });

  let pendingHighlightFrame: number | undefined;
  createEffect(() => {
    const activeIndex = options.activeIndex();
    const element = activeIndex < 0 ? undefined : itemElements[activeIndex];
    if (!element) {
      clearHighlight();
      return;
    }
    updateHighlight(element);
    if (pendingHighlightFrame !== undefined) cancelAnimationFrame(pendingHighlightFrame);
    pendingHighlightFrame = requestAnimationFrame(() => {
      pendingHighlightFrame = undefined;
      const refreshed = itemElements[activeIndex];
      if (refreshed) updateHighlight(refreshed);
    });
    if (!listRef) return;
    const containerRect = listRef.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
      element.scrollIntoView({ block: "nearest" });
    }
  });
  onCleanup(() => {
    if (pendingHighlightFrame !== undefined) cancelAnimationFrame(pendingHighlightFrame);
  });

  return {
    containerRef: (element) => {
      listRef = element;
      if (element) highlightContainerRef(element);
    },
    highlightRef,
    registerItem: (index, element) => {
      itemElements[index] = element;
    },
    rowHoverHandlers: (index) => ({
      onPointerEnter: (event) => maybeActivateHoveredIndex(index, "enter", event),
      onPointerMove: (event) => maybeActivateHoveredIndex(index, "move", event),
      onPointerLeave: () => {
        if (pendingHoverIndex === index) pendingHoverIndex = null;
      },
    }),
    handleListPointerMove: (event) => {
      if (isSettledPosition(event)) return;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      didPointerMove = true;
    },
    handleRowMouseDown: (event) => {
      const focusedElement = listRef ? getShadowActiveElement(listRef) : null;
      if (
        focusedElement instanceof HTMLElement &&
        focusedElement.matches("input[data-react-grab-input]")
      ) {
        focusedElement.blur();
      }
      event.preventDefault();
    },
  };
};
