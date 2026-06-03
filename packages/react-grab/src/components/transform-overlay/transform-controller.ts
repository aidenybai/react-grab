import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { DRAG_THRESHOLD_PX, TRANSFORM_MIN_SIZE_PX } from "../../constants.js";
import type { DropTarget, TransformFrame, TransformHandleId, ViewportBox } from "../../types.js";
import { describeElementForPrompt } from "../../utils/describe-element-for-prompt.js";
import { findDropTarget } from "../../utils/find-drop-target.js";
import { isElementConnected } from "../../utils/is-element-connected.js";
import { onViewportChange } from "../../utils/on-viewport-change.js";

interface TransformControllerDependencies {
  getElement: () => Element;
  commitStyle: (
    cssProperty: "width" | "height" | "left" | "top" | "position",
    value: number | string,
  ) => void;
  // Collapse the panel onto the dimension being resized, like keyboard stepping.
  focusProperty: (cssProperty: "width" | "height") => void;
  // The selected element left the document (e.g. removed by a re-render); the
  // panel should deselect rather than track a dead node.
  onInvalid: () => void;
}

export interface TransformController {
  frame: Accessor<TransformFrame>;
  insertionIndicator: Accessor<ViewportBox | null>;
  dragGhost: Accessor<ViewportBox | null>;
  hasMoved: () => boolean;
  describeMove: () => string;
  restore: () => void;
  startMove: (event: PointerEvent) => void;
  startResize: (event: PointerEvent, handle: TransformHandleId) => void;
}

interface DomPosition {
  parent: Node;
  nextSibling: Node | null;
}

const HANDLE_DIRECTION: Record<TransformHandleId, { x: -1 | 1; y: -1 | 1 }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
};

export const createTransformController = (
  dependencies: TransformControllerDependencies,
): TransformController => {
  // A single mutated-in-place object behind an always-notify signal keeps the
  // tracking refresh allocation-free while still driving reactivity.
  const frameValue: TransformFrame = { centerX: 0, centerY: 0, width: 0, height: 0 };
  const [frame, setFrame] = createSignal(frameValue, { equals: false });
  const [insertionIndicator, setInsertionIndicator] = createSignal<ViewportBox | null>(null);
  const [dragGhost, setDragGhost] = createSignal<ViewportBox | null>(null);
  const [didMove, setDidMove] = createSignal(false);

  // The element's DOM slot before any move, so a discarded drag can be undone.
  let originPosition: DomPosition | null = null;
  let lastDrop: DropTarget | null = null;

  // x/y are written as `left`/`top` offsets from the element's starting
  // position; static elements get `position: relative` on first interaction so
  // those offsets take effect. Read the base once — layout is settled by the
  // time the style panel opens.
  const baseStyle = getComputedStyle(dependencies.getElement());
  const baseLeft = Number.parseFloat(baseStyle.left) || 0;
  const baseTop = Number.parseFloat(baseStyle.top) || 0;
  let isPositioned = baseStyle.position !== "static";
  const offset = { x: 0, y: 0 };

  const measureFrameInto = (target: TransformFrame): void => {
    const element = dependencies.getElement();
    const rect = element.getBoundingClientRect();
    const layoutWidth =
      element instanceof HTMLElement && element.offsetWidth > 0 ? element.offsetWidth : rect.width;
    const layoutHeight =
      element instanceof HTMLElement && element.offsetHeight > 0
        ? element.offsetHeight
        : rect.height;
    target.centerX = rect.left + rect.width / 2;
    target.centerY = rect.top + rect.height / 2;
    target.width = layoutWidth;
    target.height = layoutHeight;
  };

  const ensureConnected = (): boolean => {
    if (isElementConnected(dependencies.getElement())) return true;
    dependencies.onInvalid();
    return false;
  };

  const refreshFrame = (): void => {
    if (!ensureConnected()) return;
    measureFrameInto(frameValue);
    setFrame(frameValue);
  };

  // Tear down the in-progress drag's window listeners. Tracked so a drag that
  // is still live when the controller unmounts (e.g. the element is removed
  // mid-drag) does not leak listeners holding a stale closure.
  let activeDragTeardown: (() => void) | null = null;

  const bindDrag = (
    onMove: (event: PointerEvent) => void,
    onUp?: (event: PointerEvent) => void,
  ): void => {
    activeDragTeardown?.();
    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      onMove(event);
    };
    const teardown = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleUp, { capture: true });
      window.removeEventListener("pointercancel", handleUp, { capture: true });
      activeDragTeardown = null;
    };
    const handleUp = (event: PointerEvent) => {
      teardown();
      onUp?.(event);
    };
    window.addEventListener("pointermove", handleMove, { capture: true });
    window.addEventListener("pointerup", handleUp, { capture: true });
    window.addEventListener("pointercancel", handleUp, { capture: true });
    activeDragTeardown = teardown;
  };

  const reinsert = (drop: DropTarget): void => {
    const element = dependencies.getElement();
    const parent = drop.reference.parentNode;
    const elementParent = element.parentNode;
    if (!parent || !elementParent || element === drop.reference || element.contains(drop.reference))
      return;
    const referenceNode = drop.placement === "before" ? drop.reference : drop.reference.nextSibling;
    // Skip a no-op reinsert so an unchanged DOM order isn't flagged as a move.
    if (referenceNode === element) return;
    if (element.parentNode === parent && element.nextSibling === referenceNode) return;
    if (!originPosition) {
      originPosition = { parent: elementParent, nextSibling: element.nextSibling };
    }
    parent.insertBefore(element, referenceNode);
    lastDrop = drop;
    setDidMove(true);
    refreshFrame();
  };

  const previewDropAt = (clientX: number, clientY: number): DropTarget | null => {
    const drop = findDropTarget(clientX, clientY, dependencies.getElement());
    setInsertionIndicator(drop ? drop.indicator : null);
    return drop;
  };

  const startMove = (event: PointerEvent): void => {
    if (!ensureConnected()) return;
    refreshFrame();
    const originLeft = frameValue.centerX - frameValue.width / 2;
    const originTop = frameValue.centerY - frameValue.height / 2;
    const ghostWidth = frameValue.width;
    const ghostHeight = frameValue.height;
    const downX = event.clientX;
    const downY = event.clientY;
    // A move only begins once the pointer crosses the drag threshold; a plain
    // click must not reinsert the element (it should only move when dragged).
    let isDragging = false;
    const updateGhost = (clientX: number, clientY: number): void => {
      setDragGhost({
        left: originLeft + (clientX - downX),
        top: originTop + (clientY - downY),
        width: ghostWidth,
        height: ghostHeight,
      });
    };

    bindDrag(
      (moveEvent) => {
        if (!isDragging) {
          const hasCrossedThreshold =
            Math.abs(moveEvent.clientX - downX) >= DRAG_THRESHOLD_PX ||
            Math.abs(moveEvent.clientY - downY) >= DRAG_THRESHOLD_PX;
          if (!hasCrossedThreshold) return;
          isDragging = true;
        }
        updateGhost(moveEvent.clientX, moveEvent.clientY);
        previewDropAt(moveEvent.clientX, moveEvent.clientY);
      },
      (upEvent) => {
        if (isDragging) {
          const drop = previewDropAt(upEvent.clientX, upEvent.clientY);
          if (drop) reinsert(drop);
        }
        setInsertionIndicator(null);
        setDragGhost(null);
      },
    );
  };

  const ensurePositioned = (): void => {
    if (isPositioned) return;
    dependencies.commitStyle("position", "relative");
    isPositioned = true;
  };

  const applyOffset = (): void => {
    ensurePositioned();
    dependencies.commitStyle("left", Math.round(baseLeft + offset.x));
    dependencies.commitStyle("top", Math.round(baseTop + offset.y));
    refreshFrame();
  };

  const startResize = (event: PointerEvent, handle: TransformHandleId): void => {
    if (!ensureConnected()) return;
    refreshFrame();
    const direction = HANDLE_DIRECTION[handle];
    // The frame is the border-box (offsetWidth/Height); the inline `width`
    // value, however, addresses the content box unless box-sizing is
    // border-box. Subtract padding+border so the committed value lands the
    // border-box exactly under the cursor instead of overshooting.
    const computed = getComputedStyle(dependencies.getElement());
    const isBorderBox = computed.boxSizing === "border-box";
    const extraX = isBorderBox
      ? 0
      : parseFloat(computed.paddingLeft) +
        parseFloat(computed.paddingRight) +
        parseFloat(computed.borderLeftWidth) +
        parseFloat(computed.borderRightWidth);
    const extraY = isBorderBox
      ? 0
      : parseFloat(computed.paddingTop) +
        parseFloat(computed.paddingBottom) +
        parseFloat(computed.borderTopWidth) +
        parseFloat(computed.borderBottomWidth);

    const startWidth = frameValue.width;
    const startHeight = frameValue.height;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    let didFocus = false;

    bindDrag((moveEvent) => {
      // Holding Alt/Option scales symmetrically about the center (both edges
      // move); otherwise the edge opposite the handle stays anchored.
      const fromCenter = moveEvent.altKey;
      const growthScale = fromCenter ? 2 : 1;
      const nextWidth = Math.round(
        Math.max(
          TRANSFORM_MIN_SIZE_PX,
          startWidth + growthScale * direction.x * (moveEvent.clientX - startPointerX),
        ),
      );
      const nextHeight = Math.round(
        Math.max(
          TRANSFORM_MIN_SIZE_PX,
          startHeight + growthScale * direction.y * (moveEvent.clientY - startPointerY),
        ),
      );
      const widthDelta = nextWidth - startWidth;
      const heightDelta = nextHeight - startHeight;

      dependencies.commitStyle(
        "width",
        Math.max(TRANSFORM_MIN_SIZE_PX, Math.round(nextWidth - extraX)),
      );
      dependencies.commitStyle(
        "height",
        Math.max(TRANSFORM_MIN_SIZE_PX, Math.round(nextHeight - extraY)),
      );

      // Once the size is on the tweak store, collapse the panel onto whichever
      // dimension the drag is changing most so its live value stays visible.
      if (!didFocus) {
        dependencies.focusProperty(
          Math.abs(widthDelta) >= Math.abs(heightDelta) ? "width" : "height",
        );
        didFocus = true;
      }

      // How much of each dimension's growth the position must absorb to keep the
      // intended edge fixed: half when scaling about the center (Alt), all of it
      // when dragging the top/left edge (so the opposite edge stays pinned), and
      // none when dragging the bottom/right edge (the box just extends).
      const anchorX = fromCenter ? 0.5 : direction.x === -1 ? 1 : 0;
      const anchorY = fromCenter ? 0.5 : direction.y === -1 ? 1 : 0;
      offset.x = startOffsetX - anchorX * widthDelta;
      offset.y = startOffsetY - anchorY * heightDelta;
      if (anchorX !== 0 || anchorY !== 0) {
        applyOffset();
      } else {
        refreshFrame();
      }
    });
  };

  const hasMoved = (): boolean => didMove();

  const describeMove = (): string => {
    if (!didMove() || !lastDrop) return "";
    return `Move this element to be ${lastDrop.placement} ${describeElementForPrompt(lastDrop.reference)} in the DOM.`;
  };

  const restore = (): void => {
    if (!originPosition) return;
    const element = dependencies.getElement();
    // Only move a still-connected element back to its origin; never re-attach a
    // node the app/React already removed (restore runs on every dismiss,
    // including the deselect triggered when the element is detached).
    if (isElementConnected(element) && originPosition.parent.isConnected) {
      originPosition.parent.insertBefore(element, originPosition.nextSibling);
    }
    originPosition = null;
    lastDrop = null;
    setDidMove(false);
    if (isElementConnected(element)) refreshFrame();
  };

  // Keep the frame glued to the element: viewport changes (scroll/zoom) plus a
  // ResizeObserver for size changes from any source (canvas handles, panel
  // sliders, content reflow). Drags refresh synchronously via reinsert/applyOffset.
  onMount(() => {
    refreshFrame();
    const stopViewportTracking = onViewportChange(refreshFrame);
    const resizeObserver = new ResizeObserver(() => refreshFrame());
    resizeObserver.observe(dependencies.getElement());
    // A ResizeObserver does not fire when its target is removed, so watch the
    // document tree for the element being detached and deselect if so.
    const mutationObserver = new MutationObserver(() => {
      if (!isElementConnected(dependencies.getElement())) dependencies.onInvalid();
    });
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    onCleanup(() => {
      stopViewportTracking();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      activeDragTeardown?.();
    });
  });

  return {
    frame,
    insertionIndicator,
    dragGhost,
    hasMoved,
    describeMove,
    restore,
    startMove,
    startResize,
  };
};
