import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { TRANSFORM_MIN_SIZE_PX } from "../../constants.js";
import type { TransformFrame, TransformHandleId } from "../../types.js";

interface TransformControllerDependencies {
  getElement: () => Element;
  commitStyle: (
    cssProperty: "width" | "height" | "left" | "top" | "position",
    value: number | string,
  ) => void;
}

export interface TransformController {
  frame: Accessor<TransformFrame>;
  startMove: (event: PointerEvent) => void;
  startResize: (event: PointerEvent, handle: TransformHandleId) => void;
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

  const bindDrag = (onMove: (event: PointerEvent) => void): void => {
    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      onMove(event);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleUp, { capture: true });
      window.removeEventListener("pointercancel", handleUp, { capture: true });
    };
    window.addEventListener("pointermove", handleMove, { capture: true });
    window.addEventListener("pointerup", handleUp, { capture: true });
    window.addEventListener("pointercancel", handleUp, { capture: true });
  };

  const startMove = (event: PointerEvent): void => {
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;
    bindDrag((moveEvent) => {
      offset.x = startOffsetX + (moveEvent.clientX - startPointerX);
      offset.y = startOffsetY + (moveEvent.clientY - startPointerY);
      applyOffset();
    });
  };

  const startResize = (event: PointerEvent, handle: TransformHandleId): void => {
    refreshFrame();
    const direction = HANDLE_DIRECTION[handle];
    const startWidth = frameValue.width;
    const startHeight = frameValue.height;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;

    bindDrag((moveEvent) => {
      const nextWidth = Math.round(
        Math.max(
          TRANSFORM_MIN_SIZE_PX,
          startWidth + direction.x * (moveEvent.clientX - startPointerX),
        ),
      );
      const nextHeight = Math.round(
        Math.max(
          TRANSFORM_MIN_SIZE_PX,
          startHeight + direction.y * (moveEvent.clientY - startPointerY),
        ),
      );
      dependencies.commitStyle("width", nextWidth);
      dependencies.commitStyle("height", nextHeight);

      // A plain box only extends its right/bottom edges when it grows, so
      // dragging a top/left edge must also shift the element's position to keep
      // the opposite (anchored) edge pinned. Right/bottom handles need no shift.
      if (direction.x === -1) offset.x = startOffsetX - (nextWidth - startWidth);
      if (direction.y === -1) offset.y = startOffsetY - (nextHeight - startHeight);
      if (direction.x === -1 || direction.y === -1) {
        applyOffset();
      } else {
        refreshFrame();
      }
    });
  };

  // Track the element the way the selection label does (see selection-label):
  // viewport listeners catch scroll/zoom, a ResizeObserver catches size changes
  // from any source (canvas handles, panel sliders, content reflow). Drags
  // refresh synchronously via applyOffset/refreshFrame.
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
    startMove,
    startResize,
  };
};
