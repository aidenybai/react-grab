import { createSignal, type Accessor } from "solid-js";
import { TRANSFORM_MIN_SIZE_PX, TRANSFORM_ROTATE_SNAP_DEG } from "../../constants.js";
import type {
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
  onChange: () => void;
}

export interface TransformController {
  frame: Accessor<TransformFrame>;
  refreshFrame: () => void;
  values: () => TransformValues;
  hasChanged: () => boolean;
  startMove: (event: PointerEvent) => void;
  startRotate: (event: PointerEvent) => void;
  startResize: (event: PointerEvent, handle: TransformHandleId) => void;
}

const HANDLE_DIRECTION: Record<TransformHandleId, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  nw: { x: -1, y: -1 },
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
};

const DEGREES_PER_RADIAN = 180 / Math.PI;

export const createTransformController = (
  dependencies: TransformControllerDependencies,
): TransformController => {
  const transform: TransformValues = { translateX: 0, translateY: 0, rotate: 0 };
  // A single mutated-in-place object behind an always-notify signal keeps the
  // per-frame tracking loop allocation-free while still driving reactivity.
  const frameValue: TransformFrame = {
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
    rotate: 0,
  };
  const [frame, setFrame] = createSignal(frameValue, { equals: false });

  const measureFrameInto = (target: TransformFrame): void => {
    const element = dependencies.getElement();
    const rect = element.getBoundingClientRect();
    const layoutWidth =
      element instanceof HTMLElement && element.offsetWidth > 0 ? element.offsetWidth : rect.width;
    const layoutHeight =
      element instanceof HTMLElement && element.offsetHeight > 0
        ? element.offsetHeight
        : rect.height;
    // The axis-aligned bounding-box center equals the element's geometric
    // center under a center-origin rotate + translate, so it stays accurate
    // even once the element is rotated.
    target.centerX = rect.left + rect.width / 2;
    target.centerY = rect.top + rect.height / 2;
    target.width = layoutWidth;
    target.height = layoutHeight;
    target.rotate = transform.rotate;
  };

  const refreshFrame = (): void => {
    measureFrameInto(frameValue);
    setFrame(frameValue);
  };

  const applyTransform = (): void => {
    dependencies.preview.apply(["transform-origin"], "center center");
    dependencies.preview.apply(
      ["transform"],
      `translate(${transform.translateX}px, ${transform.translateY}px) rotate(${transform.rotate}deg)`,
    );
    refreshFrame();
    dependencies.onInteract();
    dependencies.onChange();
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

  const startRotate = (event: PointerEvent): void => {
    refreshFrame();
    const centerX = frameValue.centerX;
    const centerY = frameValue.centerY;
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const startRotate = transform.rotate;
    bindDrag((moveEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const nextRotate = startRotate + (angle - startAngle) * DEGREES_PER_RADIAN;
      transform.rotate = moveEvent.shiftKey
        ? Math.round(nextRotate / TRANSFORM_ROTATE_SNAP_DEG) * TRANSFORM_ROTATE_SNAP_DEG
        : nextRotate;
      applyTransform();
    });
  };

  const startResize = (event: PointerEvent, handle: TransformHandleId): void => {
    refreshFrame();
    const direction = HANDLE_DIRECTION[handle];
    const startWidth = frameValue.width;
    const startHeight = frameValue.height;
    const startCenterX = frameValue.centerX;
    const startCenterY = frameValue.centerY;
    const startTranslateX = transform.translateX;
    const startTranslateY = transform.translateY;
    const startPointerX = event.clientX;
    const startPointerY = event.clientY;

    const radians = (transform.rotate * Math.PI) / 180;
    const axisXCos = Math.cos(radians);
    const axisXSin = Math.sin(radians);
    // Local +x axis is (axisXCos, axisXSin); local +y axis is its perpendicular.
    const anchorLocalX = (-direction.x * startWidth) / 2;
    const anchorLocalY = (-direction.y * startHeight) / 2;
    const anchorWorldX = startCenterX + axisXCos * anchorLocalX + -axisXSin * anchorLocalY;
    const anchorWorldY = startCenterY + axisXSin * anchorLocalX + axisXCos * anchorLocalY;

    bindDrag((moveEvent) => {
      const pointerDeltaX = moveEvent.clientX - startPointerX;
      const pointerDeltaY = moveEvent.clientY - startPointerY;
      const localDeltaX = pointerDeltaX * axisXCos + pointerDeltaY * axisXSin;
      const localDeltaY = pointerDeltaX * -axisXSin + pointerDeltaY * axisXCos;

      const nextWidth =
        direction.x === 0
          ? startWidth
          : Math.max(TRANSFORM_MIN_SIZE_PX, startWidth + direction.x * localDeltaX);
      const nextHeight =
        direction.y === 0
          ? startHeight
          : Math.max(TRANSFORM_MIN_SIZE_PX, startHeight + direction.y * localDeltaY);

      // Reset translate to its baseline so the post-resize measurement reflects
      // only the browser's own layout reflow, then commit the new dimensions.
      transform.translateX = startTranslateX;
      transform.translateY = startTranslateY;
      if (direction.x !== 0) dependencies.commitSize("width", Math.round(nextWidth));
      if (direction.y !== 0) dependencies.commitSize("height", Math.round(nextHeight));
      applyTransform();

      // Layout may have shifted the box; nudge translate so the anchored edge
      // (opposite the dragged handle) stays pinned in viewport space.
      const measuredWidth = frameValue.width;
      const measuredHeight = frameValue.height;
      const measuredAnchorLocalX = (-direction.x * measuredWidth) / 2;
      const measuredAnchorLocalY = (-direction.y * measuredHeight) / 2;
      const measuredAnchorWorldX =
        frameValue.centerX + axisXCos * measuredAnchorLocalX + -axisXSin * measuredAnchorLocalY;
      const measuredAnchorWorldY =
        frameValue.centerY + axisXSin * measuredAnchorLocalX + axisXCos * measuredAnchorLocalY;

      transform.translateX = startTranslateX + (anchorWorldX - measuredAnchorWorldX);
      transform.translateY = startTranslateY + (anchorWorldY - measuredAnchorWorldY);
      applyTransform();
    });
  };

  const hasChanged = (): boolean =>
    transform.translateX !== 0 || transform.translateY !== 0 || transform.rotate !== 0;

  return {
    frame,
    refreshFrame,
    values: () => transform,
    hasChanged,
    startMove,
    startRotate,
    startResize,
  };
};

export const formatTransformValue = (values: TransformValues): string =>
  `translate(${Math.round(values.translateX)}px, ${Math.round(values.translateY)}px) rotate(${Math.round(values.rotate)}deg)`;
