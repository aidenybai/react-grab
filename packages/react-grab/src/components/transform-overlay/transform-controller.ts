import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { TRANSFORM_MIN_SIZE_PX } from "../../constants.js";
import type {
  DropTarget,
  TransformDragGhost,
  TransformFrame,
  TransformHandleId,
  TransformInsertionIndicator,
} from "../../types.js";
import { describeElementForPrompt } from "../../utils/describe-element-for-prompt.js";
import { findDropTarget } from "../../utils/find-drop-target.js";

interface TransformControllerDependencies {
  getElement: () => Element;
  commitStyle: (
    cssProperty: "width" | "height" | "left" | "top" | "position",
    value: number | string,
  ) => void;
  // Collapse the panel onto the dimension being resized, like keyboard stepping.
  focusProperty: (cssProperty: "width" | "height") => void;
}

export interface TransformController {
  frame: Accessor<TransformFrame>;
  insertionIndicator: Accessor<TransformInsertionIndicator | null>;
  dragGhost: Accessor<TransformDragGhost | null>;
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
  const [insertionIndicator, setInsertionIndicator] =
    createSignal<TransformInsertionIndicator | null>(null);
  const [dragGhost, setDragGhost] = createSignal<TransformDragGhost | null>(null);
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

  const refreshFrame = (): void => {
    measureFrameInto(frameValue);
    setFrame(frameValue);
  };

  const bindDrag = (
    onMove: (event: PointerEvent) => void,
    onUp?: (event: PointerEvent) => void,
  ): void => {
    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      onMove(event);
    };
    const handleUp = (event: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleUp, { capture: true });
      window.removeEventListener("pointercancel", handleUp, { capture: true });
      onUp?.(event);
    };
    window.addEventListener("pointermove", handleMove, { capture: true });
    window.addEventListener("pointerup", handleUp, { capture: true });
    window.addEventListener("pointercancel", handleUp, { capture: true });
  };

  const reinsert = (drop: DropTarget): void => {
    const element = dependencies.getElement();
    const parent = drop.reference.parentNode;
    if (!parent || element === drop.reference || element.contains(drop.reference)) return;
    if (!originPosition) {
      originPosition = { parent: element.parentNode!, nextSibling: element.nextSibling };
    }
    const referenceNode = drop.placement === "before" ? drop.reference : drop.reference.nextSibling;
    if (referenceNode === element) return;
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
    refreshFrame();
    const originLeft = frameValue.centerX - frameValue.width / 2;
    const originTop = frameValue.centerY - frameValue.height / 2;
    const ghostWidth = frameValue.width;
    const ghostHeight = frameValue.height;
    const downX = event.clientX;
    const downY = event.clientY;
    const updateGhost = (clientX: number, clientY: number): void => {
      setDragGhost({
        left: originLeft + (clientX - downX),
        top: originTop + (clientY - downY),
        width: ghostWidth,
        height: ghostHeight,
      });
    };

    updateGhost(downX, downY);
    previewDropAt(downX, downY);
    bindDrag(
      (moveEvent) => {
        updateGhost(moveEvent.clientX, moveEvent.clientY);
        previewDropAt(moveEvent.clientX, moveEvent.clientY);
      },
      (upEvent) => {
        const drop = previewDropAt(upEvent.clientX, upEvent.clientY);
        if (drop) reinsert(drop);
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

      if (fromCenter) {
        // Keep the center pinned by shifting position half the growth.
        offset.x = startOffsetX - widthDelta / 2;
        offset.y = startOffsetY - heightDelta / 2;
        applyOffset();
        return;
      }

      // A plain box only extends its right/bottom edges when it grows, so
      // dragging a top/left edge must also shift the element's position to keep
      // the opposite (anchored) edge pinned. Right/bottom handles need no shift.
      if (direction.x === -1) offset.x = startOffsetX - widthDelta;
      if (direction.y === -1) offset.y = startOffsetY - heightDelta;
      if (direction.x === -1 || direction.y === -1) {
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
    originPosition.parent.insertBefore(element, originPosition.nextSibling);
    originPosition = null;
    lastDrop = null;
    setDidMove(false);
    refreshFrame();
  };

  // Track the element the way the selection label does (see selection-label):
  // viewport listeners catch scroll/zoom, a ResizeObserver catches size changes
  // from any source (canvas handles, panel sliders, content reflow). Drags
  // refresh synchronously via reinsert/applyOffset.
  onMount(() => {
    refreshFrame();
    const handleViewportChange = () => refreshFrame();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    const resizeObserver = new ResizeObserver(() => refreshFrame());
    resizeObserver.observe(dependencies.getElement());
    onCleanup(() => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      resizeObserver.disconnect();
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
