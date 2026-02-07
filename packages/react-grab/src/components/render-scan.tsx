import { onMount, onCleanup, createEffect, on } from "solid-js";
import type { Component } from "solid-js";
import type { Fiber } from "bippy";
import { lerp } from "../utils/lerp.js";
import {
  Z_INDEX_OVERLAY_CANVAS,
  MIN_DEVICE_PIXEL_RATIO,
  RENDER_SCAN_PRIMARY_COLOR,
  RENDER_SCAN_INTERPOLATION_SPEED,
  RENDER_SCAN_TOTAL_FRAMES,
  RENDER_SCAN_MAX_LABEL_LENGTH,
  RENDER_SCAN_FLUSH_INTERVAL_MS,
  RENDER_SCAN_MONO_FONT,
} from "../constants.js";
import { setRenderCallback, type PendingRender } from "../utils/scan.js";

interface AnimatedBox {
  fiberId: number;
  componentName: string;
  renderCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
  frameIndex: number;
}

interface RenderBox {
  fiberId: number;
  componentName: string;
  renderCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LabelInfo {
  text: string;
  textWidth: number;
  textHeight: number;
  opacity: number;
  x: number;
  y: number;
  boxes: AnimatedBox[];
}

let renderBoxIdCounter = 0;
const generateRenderBoxId = (): number => ++renderBoxIdCounter;

const computeUnionBoundingRect = (rects: DOMRect[]): DOMRect => {
  if (rects.length === 1) return rects[0];

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let index = 1; index < rects.length; index++) {
    const rect = rects[index];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

const formatRenderCountLabel = (boxes: AnimatedBox[]): string => {
  const countByComponent = new Map<string, number>();
  for (const box of boxes) {
    countByComponent.set(
      box.componentName,
      (countByComponent.get(box.componentName) || 0) + box.renderCount,
    );
  }

  const grouped = Map.groupBy(countByComponent, ([, count]) => count);
  const text = [...grouped.entries()]
    .sort(([countA], [countB]) => countB - countA)
    .map(
      ([count, entries]) =>
        `${entries
          .map(([name]) => name)
          .slice(0, 4)
          .join(", ")} ×${count}`,
    )
    .join(", ");

  return text.length > RENDER_SCAN_MAX_LABEL_LENGTH
    ? `${text.slice(0, RENDER_SCAN_MAX_LABEL_LENGTH)}…`
    : text;
};

const mergeRendersIntoAnimatedBoxes = (
  animatedBoxes: Map<number, AnimatedBox>,
  newBoxes: RenderBox[],
): void => {
  for (const box of newBoxes) {
    const existing = animatedBoxes.get(box.fiberId);
    if (existing) {
      Object.assign(existing, {
        renderCount: existing.renderCount + 1,
        frameIndex: 0,
        targetX: box.x,
        targetY: box.y,
        targetWidth: box.width,
        targetHeight: box.height,
      });
    } else {
      animatedBoxes.set(box.fiberId, {
        ...box,
        targetX: box.x,
        targetY: box.y,
        targetWidth: box.width,
        targetHeight: box.height,
        frameIndex: 0,
      });
    }
  }
};

const interpolateAnimatedBox = (box: AnimatedBox): void => {
  const speed = RENDER_SCAN_INTERPOLATION_SPEED;
  box.x = lerp(box.x, box.targetX, speed);
  box.y = lerp(box.y, box.targetY, speed);
  box.width = lerp(box.width, box.targetWidth, speed);
  box.height = lerp(box.height, box.targetHeight, speed);
};

const computeOpacity = (frameIndex: number): number =>
  1 - frameIndex / RENDER_SCAN_TOTAL_FRAMES;

const areRectsOverlapping = (
  rectA: { x: number; y: number; width: number; height: number },
  rectB: { x: number; y: number; width: number; height: number },
): boolean =>
  rectA.x + rectA.width > rectB.x &&
  rectB.x + rectB.width > rectA.x &&
  rectA.y + rectA.height > rectB.y &&
  rectB.y + rectB.height > rectA.y;

const drawRenderScanFrame = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pixelRatio: number,
  animatedBoxes: Map<number, AnimatedBox>,
): boolean => {
  context.clearRect(
    0,
    0,
    canvas.width / pixelRatio,
    canvas.height / pixelRatio,
  );

  const boxesByPosition = new Map<string, AnimatedBox[]>();
  const uniqueRects = new Map<
    string,
    { x: number; y: number; width: number; height: number; opacity: number }
  >();

  for (const box of animatedBoxes.values()) {
    interpolateAnimatedBox(box);

    const positionKey = `${box.targetX},${box.targetY}`;
    const rectKey = `${positionKey},${box.targetWidth},${box.targetHeight}`;

    const boxGroup = boxesByPosition.get(positionKey) || [];
    boxGroup.push(box);
    boxesByPosition.set(positionKey, boxGroup);

    const opacity = computeOpacity(box.frameIndex);
    box.frameIndex++;

    const existingRect = uniqueRects.get(rectKey);
    if (!existingRect || opacity > existingRect.opacity) {
      uniqueRects.set(rectKey, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        opacity,
      });
    }
  }

  for (const rect of uniqueRects.values()) {
    context.strokeStyle = `rgba(${RENDER_SCAN_PRIMARY_COLOR},${rect.opacity})`;
    context.lineWidth = 1;
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.stroke();
    context.fillStyle = `rgba(${RENDER_SCAN_PRIMARY_COLOR},${rect.opacity * 0.1})`;
    context.fill();
  }

  context.font = `11px ${RENDER_SCAN_MONO_FONT}`;
  context.textRendering = "optimizeSpeed";

  const labels = new Map<string, LabelInfo>();

  for (const boxes of boxesByPosition.values()) {
    const firstBox = boxes[0];
    const opacity = computeOpacity(firstBox.frameIndex);
    const text = formatRenderCountLabel(boxes);
    const textWidth = context.measureText(text).width;
    const textHeight = 11;

    labels.set(`${firstBox.x},${firstBox.y},${textWidth},${text}`, {
      text,
      textWidth,
      textHeight,
      opacity,
      x: firstBox.x,
      y: firstBox.y,
      boxes,
    });

    if (firstBox.frameIndex > RENDER_SCAN_TOTAL_FRAMES) {
      for (const box of boxes) {
        animatedBoxes.delete(box.fiberId);
      }
    }
  }

  const sortedLabels = [...labels.entries()].sort(([, labelA], [, labelB]) => {
    const areaA = labelA.boxes.reduce(
      (sum, box) => sum + box.width * box.height,
      0,
    );
    const areaB = labelB.boxes.reduce(
      (sum, box) => sum + box.width * box.height,
      0,
    );
    return areaB - areaA;
  });

  for (const [labelKey, label] of sortedLabels) {
    if (!labels.has(labelKey)) continue;

    for (const [otherKey, otherLabel] of labels.entries()) {
      if (labelKey === otherKey) continue;

      const shouldMerge = areRectsOverlapping(
        {
          x: label.x,
          y: label.y,
          width: label.textWidth,
          height: label.textHeight,
        },
        {
          x: otherLabel.x,
          y: otherLabel.y,
          width: otherLabel.textWidth,
          height: otherLabel.textHeight,
        },
      );

      if (shouldMerge) {
        label.boxes = [...label.boxes, ...otherLabel.boxes];
        label.text = formatRenderCountLabel(label.boxes);
        label.textWidth = context.measureText(label.text).width;
        labels.delete(otherKey);
      }
    }
  }

  for (const label of labels.values()) {
    const labelY = Math.max(0, label.y - label.textHeight - 4);

    context.fillStyle = `rgba(${RENDER_SCAN_PRIMARY_COLOR},${label.opacity})`;
    context.fillRect(
      label.x,
      labelY,
      label.textWidth + 4,
      label.textHeight + 4,
    );

    context.fillStyle = `rgba(255,255,255,${label.opacity})`;
    context.fillText(label.text, label.x + 2, labelY + label.textHeight);
  }

  return animatedBoxes.size > 0;
};

export interface RenderScanProps {
  enabled?: boolean;
}

export const RenderScan: Component<RenderScanProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let context: CanvasRenderingContext2D | null = null;
  let pixelRatio = 1;
  let animationFrameId: number | null = null;
  let flushIntervalId: ReturnType<typeof setInterval> | null = null;
  let isEnabled = false;

  const animatedBoxes = new Map<number, AnimatedBox>();
  const fiberToBoxId = new WeakMap<Fiber, number>();
  const pendingRenderBoxes: RenderBox[] = [];

  const getBoxIdForFiber = (fiber: Fiber): number => {
    const existingId = fiberToBoxId.get(fiber);
    if (existingId !== undefined) return existingId;
    const newId = generateRenderBoxId();
    fiberToBoxId.set(fiber, newId);
    return newId;
  };

  const clearCanvas = (): void => {
    if (!context || !canvasRef) return;
    context.clearRect(
      0,
      0,
      canvasRef.width / pixelRatio,
      canvasRef.height / pixelRatio,
    );
  };

  const initializeCanvas = (): void => {
    if (!canvasRef) return;

    pixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    canvasRef.width = canvasWidth * pixelRatio;
    canvasRef.height = canvasHeight * pixelRatio;
    canvasRef.style.width = `${canvasWidth}px`;
    canvasRef.style.height = `${canvasHeight}px`;

    context = canvasRef.getContext("2d", { alpha: true });
    if (context) {
      context.scale(pixelRatio, pixelRatio);
    }
  };

  const renderFrame = (): void => {
    if (!context || !canvasRef) return;

    const hasMoreFrames = drawRenderScanFrame(
      context,
      canvasRef,
      pixelRatio,
      animatedBoxes,
    );
    animationFrameId = hasMoreFrames
      ? requestAnimationFrame(renderFrame)
      : null;
  };

  const processRenders = (): void => {
    if (pendingRenderBoxes.length === 0) return;

    mergeRendersIntoAnimatedBoxes(animatedBoxes, pendingRenderBoxes);
    pendingRenderBoxes.length = 0;

    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(renderFrame);
    }
  };

  const handleRenders = (renders: PendingRender[]): void => {
    if (!isEnabled) return;

    for (const render of renders) {
      const elementRects: DOMRect[] = [];

      for (const element of render.domElements) {
        if (!(element instanceof Element)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elementRects.push(rect);
        }
      }

      if (elementRects.length === 0) continue;

      const boundingRect = computeUnionBoundingRect(elementRects);
      pendingRenderBoxes.push({
        fiberId: getBoxIdForFiber(render.fiber),
        componentName: render.componentName,
        renderCount: render.renderCount,
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height,
      });
    }
  };

  const handleResize = (): void => {
    initializeCanvas();
    if (animationFrameId === null && animatedBoxes.size > 0) {
      animationFrameId = requestAnimationFrame(renderFrame);
    }
  };

  onMount(() => {
    initializeCanvas();
    setRenderCallback(handleRenders);

    flushIntervalId = setInterval(() => {
      if (pendingRenderBoxes.length > 0 && isEnabled) {
        requestAnimationFrame(processRenders);
      }
    }, RENDER_SCAN_FLUSH_INTERVAL_MS);

    window.addEventListener("resize", handleResize);

    createEffect(
      on(
        () => props.enabled,
        (enabled) => {
          isEnabled = Boolean(enabled);
          if (!enabled) {
            pendingRenderBoxes.length = 0;
            animatedBoxes.clear();
            clearCanvas();
            if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
          }
        },
      ),
    );

    onCleanup(() => {
      setRenderCallback(null);
      pendingRenderBoxes.length = 0;
      animatedBoxes.clear();
      clearCanvas();

      window.removeEventListener("resize", handleResize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (flushIntervalId !== null) {
        clearInterval(flushIntervalId);
      }
    });
  });

  return (
    <canvas
      ref={canvasRef}
      data-react-grab-render-scan
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        "pointer-events": "none",
        "z-index": String(Z_INDEX_OVERLAY_CANVAS - 1),
      }}
    />
  );
};
