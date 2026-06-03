import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { TRANSFORM_MIN_SIZE_PX } from "../../constants.js";
import type {
  PendingEdit,
  PreviewStyles,
  TransformFrame,
  TransformHandleId,
  TransformValues,
} from "../../types.js";

interface TransformControllerDependencies {
  getElement: () => Element;
  preview: PreviewStyles;
  commitSize: (cssProperty: "width" | "height", valuePx: number) => void;
  onInteract: () => void;
}

export interface TransformController {
  frame: Accessor<TransformFrame>;
  hasChanged: () => boolean;
  buildPendingEdit: () => PendingEdit | null;
  startMove: (event: PointerEvent) => void;
  startResize: (event: PointerEvent, handle: TransformHandleId) => void;
}

const HANDLE_DIRECTION: Record<TransformHandleId, { x: -1 | 1; y: -1 | 1 }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
};

const formatTransform = (values: TransformValues, round: boolean): string => {
  const translateX = round ? Math.round(values.translateX) : values.translateX;
  const translateY = round ? Math.round(values.translateY) : values.translateY;
  return `translate(${translateX}px, ${translateY}px)`;
};

export const createTransformController = (
  dependencies: TransformControllerDependencies,
): TransformController => {
  const transform: TransformValues = { translateX: 0, translateY: 0 };
  // A single mutated-in-place object behind an always-notify signal keeps the
  // tracking refresh allocation-free while still driving reactivity.
  const frameValue: TransformFrame = { centerX: 0, centerY: 0, width: 0, height: 0 };
  const [frame, setFrame] = createSignal(frameValue, { equals: false });
  // Bumped on every applied edit so `hasChanged` stays reactive without
  // mirroring the mutable `transform` into a second signal.
  const [trackTransformEdits, notifyTransformEdit] = createSignal<void>(undefined, {
    equals: false,
  });

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

  const applyTransform = (): void => {
    dependencies.preview.apply(["transform"], formatTransform(transform, false));
    refreshFrame();
    notifyTransformEdit();
    dependencies.onInteract();
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
    const startTranslateX = transform.translateX;
    const startTranslateY = transform.translateY;
    bindDrag((moveEvent) => {
      transform.translateX = startTranslateX + (moveEvent.clientX - startPointerX);
      transform.translateY = startTranslateY + (moveEvent.clientY - startPointerY);
      applyTransform();
    });
  };

  const startResize = (event: PointerEvent, handle: TransformHandleId): void => {
    refreshFrame();
    const direction = HANDLE_DIRECTION[handle];
    const startWidth = frameValue.width;
    const startHeight = frameValue.height;
    const startTranslateX = transform.translateX;
    const startTranslateY = transform.translateY;
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    // World position of the corner opposite the dragged handle; it must stay
    // pinned in the viewport as the box grows/shrinks.
    const anchorWorldX = frameValue.centerX - (direction.x * startWidth) / 2;
    const anchorWorldY = frameValue.centerY - (direction.y * startHeight) / 2;

    bindDrag((moveEvent) => {
      const nextWidth = Math.max(
        TRANSFORM_MIN_SIZE_PX,
        startWidth + direction.x * (moveEvent.clientX - startPointerX),
      );
      const nextHeight = Math.max(
        TRANSFORM_MIN_SIZE_PX,
        startHeight + direction.y * (moveEvent.clientY - startPointerY),
      );

      // Reset translate to its baseline so the post-resize measurement reflects
      // only the browser's own layout reflow, then commit the new dimensions.
      transform.translateX = startTranslateX;
      transform.translateY = startTranslateY;
      dependencies.commitSize("width", Math.round(nextWidth));
      dependencies.commitSize("height", Math.round(nextHeight));
      applyTransform();

      // Layout may have shifted the box; nudge translate so the anchored corner
      // stays pinned. A pure grow from the top-left needs no nudge (static
      // layout already pins it); growing from the top/left does.
      const measuredAnchorX = frameValue.centerX - (direction.x * frameValue.width) / 2;
      const measuredAnchorY = frameValue.centerY - (direction.y * frameValue.height) / 2;
      transform.translateX = startTranslateX + (anchorWorldX - measuredAnchorX);
      transform.translateY = startTranslateY + (anchorWorldY - measuredAnchorY);
      applyTransform();
    });
  };

  // Round before testing so a pure resize, whose anchor compensation can leave
  // sub-pixel translate residue, does not report a change (and `buildPendingEdit`
  // would emit a no-op `translate(0px, 0px)`).
  const hasChanged = (): boolean => {
    trackTransformEdits();
    return Math.round(transform.translateX) !== 0 || Math.round(transform.translateY) !== 0;
  };

  const buildPendingEdit = (): PendingEdit | null => {
    if (!hasChanged()) return null;
    return {
      kind: "transform",
      key: "transform",
      cssProperties: ["transform"],
      value: formatTransform(transform, true),
    };
  };

  // Track the element the way the selection label does (see selection-label):
  // viewport listeners catch scroll/zoom, a ResizeObserver catches size changes
  // from any source (canvas handles, panel sliders, content reflow). This avoids
  // an always-on per-frame getBoundingClientRect poll — drags already refresh
  // synchronously via applyTransform.
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
    hasChanged,
    buildPendingEdit,
    startMove,
    startResize,
  };
};
