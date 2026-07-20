import {
  BASELINE_FRAME_DURATION_MS,
  FADE_DURATION_MS,
  FEEDBACK_DURATION_MS,
  LERP_CONVERGENCE_THRESHOLD_PX,
  OPACITY_CONVERGENCE_THRESHOLD,
} from "../constants.js";
import type { OverlayBounds } from "../types.js";
import { adjustLerpForFrameDuration } from "../utils/adjust-lerp-for-frame-duration.js";
import { lerp } from "../utils/lerp.js";
import { parseBorderRadiusValue } from "../utils/parse-border-radius-value.js";

export interface OverlayCanvasSelectionState {
  isVisible: boolean;
  bounds?: OverlayBounds;
  boundsMultiple?: OverlayBounds[];
  shouldSnap?: boolean;
}

export interface OverlayCanvasDragState {
  isVisible: boolean;
  bounds?: OverlayBounds;
}

export interface OverlayCanvasGrabbedBox {
  id: string;
  bounds: OverlayBounds;
  createdAt: number;
}

export interface OverlayCanvasLabelBox {
  id: string;
  bounds: OverlayBounds;
  boundsMultiple?: OverlayBounds[];
  isFading: boolean;
}

export interface OverlayCanvasGrabbedState {
  boxes: OverlayCanvasGrabbedBox[];
  labels: OverlayCanvasLabelBox[];
}

export interface OverlayCanvasInitialState {
  selection: OverlayCanvasSelectionState;
  drag: OverlayCanvasDragState;
  grabbed: OverlayCanvasGrabbedState;
}

export interface OverlayCanvasRendererScheduler {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (animationFrameId: number) => void;
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (timeoutId: number) => void;
}

export interface OverlayCanvasRendererOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  devicePixelRatio: number;
  colorSpace: PredefinedColorSpace;
  styles: OverlayCanvasRendererStyles;
  scheduler: OverlayCanvasRendererScheduler;
  initialState: OverlayCanvasInitialState;
}

export interface OverlayCanvasRenderer {
  resize: (width: number, height: number, devicePixelRatio: number) => void;
  updateSelection: (state: OverlayCanvasSelectionState) => void;
  updateDrag: (state: OverlayCanvasDragState) => void;
  updateGrabbed: (state: OverlayCanvasGrabbedState) => void;
  destroy: () => void;
}

export interface OverlayCanvasLayerStyle {
  borderColor: string;
  fillColor: string;
  lerpFactor: number;
}

export interface OverlayCanvasRendererStyles {
  drag: OverlayCanvasLayerStyle;
  selection: OverlayCanvasLayerStyle;
}

interface MutableBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnimatedBounds {
  id: string;
  current: MutableBounds;
  target: MutableBounds;
  borderRadius: number;
  opacity: number;
  targetOpacity: number;
  createdAt?: number;
  fadeStartTimestamp: number | null;
}

interface RendererState {
  selection: OverlayCanvasSelectionState;
  drag: OverlayCanvasDragState;
  grabbed: OverlayCanvasGrabbedState;
}

const getRenderingContext = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  colorSpace: PredefinedColorSpace,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null => {
  if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
    return canvas.getContext("2d", { colorSpace });
  }
  return canvas.getContext("2d", { colorSpace });
};

const createMutableBounds = (bounds: OverlayBounds): MutableBounds => ({
  x: bounds.x,
  y: bounds.y,
  width: bounds.width,
  height: bounds.height,
});

const createAnimatedBounds = (
  id: string,
  bounds: OverlayBounds,
  options?: { createdAt?: number; opacity?: number; targetOpacity?: number },
): AnimatedBounds => ({
  id,
  current: createMutableBounds(bounds),
  target: createMutableBounds(bounds),
  borderRadius: parseBorderRadiusValue(bounds.borderRadius),
  opacity: options?.opacity ?? 1,
  targetOpacity: options?.targetOpacity ?? options?.opacity ?? 1,
  createdAt: options?.createdAt,
  fadeStartTimestamp: null,
});

const updateAnimationTarget = (
  animation: AnimatedBounds,
  bounds: OverlayBounds,
  targetOpacity?: number,
) => {
  animation.target.x = bounds.x;
  animation.target.y = bounds.y;
  animation.target.width = bounds.width;
  animation.target.height = bounds.height;
  animation.borderRadius = parseBorderRadiusValue(bounds.borderRadius);
  if (targetOpacity === undefined) return;
  if (targetOpacity > animation.targetOpacity) {
    animation.opacity = targetOpacity;
  }
  animation.targetOpacity = targetOpacity;
};

const drawRoundedRectangle = (
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bounds: MutableBounds,
  cornerRadius: number,
  fillColor: string,
  strokeColor: string,
  opacity: number,
) => {
  if (bounds.width <= 0 || bounds.height <= 0) return;

  const maxCornerRadius = Math.min(bounds.width / 2, bounds.height / 2);
  const clampedCornerRadius = Math.min(cornerRadius, maxCornerRadius);
  const shouldSetGlobalAlpha = opacity !== 1;
  if (shouldSetGlobalAlpha) context.globalAlpha = opacity;
  context.beginPath();
  if (clampedCornerRadius > 0) {
    context.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, clampedCornerRadius);
  } else {
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  context.fillStyle = fillColor;
  context.fill();
  context.strokeStyle = strokeColor;
  context.lineWidth = 1;
  context.stroke();
  if (shouldSetGlobalAlpha) context.globalAlpha = 1;
};

const interpolateBounds = (
  animation: AnimatedBounds,
  lerpFactor: number,
  shouldInterpolateOpacity: boolean,
): boolean => {
  const lerpedX = lerp(animation.current.x, animation.target.x, lerpFactor);
  const lerpedY = lerp(animation.current.y, animation.target.y, lerpFactor);
  const lerpedWidth = lerp(animation.current.width, animation.target.width, lerpFactor);
  const lerpedHeight = lerp(animation.current.height, animation.target.height, lerpFactor);
  const hasBoundsConverged =
    Math.abs(lerpedX - animation.target.x) < LERP_CONVERGENCE_THRESHOLD_PX &&
    Math.abs(lerpedY - animation.target.y) < LERP_CONVERGENCE_THRESHOLD_PX &&
    Math.abs(lerpedWidth - animation.target.width) < LERP_CONVERGENCE_THRESHOLD_PX &&
    Math.abs(lerpedHeight - animation.target.height) < LERP_CONVERGENCE_THRESHOLD_PX;

  animation.current.x = hasBoundsConverged ? animation.target.x : lerpedX;
  animation.current.y = hasBoundsConverged ? animation.target.y : lerpedY;
  animation.current.width = hasBoundsConverged ? animation.target.width : lerpedWidth;
  animation.current.height = hasBoundsConverged ? animation.target.height : lerpedHeight;

  if (!shouldInterpolateOpacity) return !hasBoundsConverged;

  const lerpedOpacity = lerp(animation.opacity, animation.targetOpacity, lerpFactor);
  const hasOpacityConverged =
    Math.abs(lerpedOpacity - animation.targetOpacity) < OPACITY_CONVERGENCE_THRESHOLD;
  animation.opacity = hasOpacityConverged ? animation.targetOpacity : lerpedOpacity;
  return !hasBoundsConverged || !hasOpacityConverged;
};

export const createOverlayCanvasRenderer = (
  options: OverlayCanvasRendererOptions,
): OverlayCanvasRenderer => {
  const context = getRenderingContext(options.canvas, options.colorSpace);
  let canvasWidth = options.width;
  let canvasHeight = options.height;
  let devicePixelRatio = options.devicePixelRatio;
  let animationFrameId: number | null = null;
  let fadeWakeTimeoutId: number | null = null;
  let previousFrameTimestamp: number | null = null;
  let selectionAnimations: AnimatedBounds[] = [];
  let dragAnimation: AnimatedBounds | null = null;
  let grabbedAnimations: AnimatedBounds[] = [];
  const state: RendererState = {
    selection: options.initialState.selection,
    drag: options.initialState.drag,
    grabbed: options.initialState.grabbed,
  };

  const resize = (width: number, height: number, nextDevicePixelRatio: number) => {
    canvasWidth = width;
    canvasHeight = height;
    devicePixelRatio = nextDevicePixelRatio;
    options.canvas.width = canvasWidth * devicePixelRatio;
    options.canvas.height = canvasHeight * devicePixelRatio;
  };

  const renderAnimations = (animations: AnimatedBounds[], style: OverlayCanvasLayerStyle) => {
    if (!context) return;
    for (const animation of animations) {
      drawRoundedRectangle(
        context,
        animation.current,
        animation.borderRadius,
        style.fillColor,
        style.borderColor,
        animation.opacity,
      );
    }
  };

  const render = () => {
    if (!context || canvasWidth <= 0 || canvasHeight <= 0) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, options.canvas.width, options.canvas.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    if (state.drag.isVisible && dragAnimation) {
      drawRoundedRectangle(
        context,
        dragAnimation.current,
        dragAnimation.borderRadius,
        options.styles.drag.fillColor,
        options.styles.drag.borderColor,
        dragAnimation.opacity,
      );
    }
    if (state.selection.isVisible) {
      renderAnimations(selectionAnimations, options.styles.selection);
    }
    renderAnimations(grabbedAnimations, options.styles.selection);
  };

  const scheduleAnimationFrame = () => {
    if (fadeWakeTimeoutId !== null) {
      options.scheduler.clearTimeout(fadeWakeTimeoutId);
      fadeWakeTimeoutId = null;
    }
    if (animationFrameId !== null) return;
    animationFrameId = options.scheduler.requestFrame(runAnimationFrame);
  };

  const runAnimationFrame = (currentFrameTimestamp: number) => {
    const frameDurationMs =
      previousFrameTimestamp !== null
        ? currentFrameTimestamp - previousFrameTimestamp
        : BASELINE_FRAME_DURATION_MS;
    previousFrameTimestamp = currentFrameTimestamp;
    const dragLerpForFrame = adjustLerpForFrameDuration(
      options.styles.drag.lerpFactor,
      frameDurationMs,
    );
    const selectionLerpForFrame = adjustLerpForFrameDuration(
      options.styles.selection.lerpFactor,
      frameDurationMs,
    );
    let shouldContinueAnimating = false;
    let nextFadeDelayMs: number | null = null;

    if (dragAnimation && interpolateBounds(dragAnimation, dragLerpForFrame, false)) {
      shouldContinueAnimating = true;
    }
    for (const animation of selectionAnimations) {
      if (interpolateBounds(animation, selectionLerpForFrame, false)) {
        shouldContinueAnimating = true;
      }
    }

    const currentTimestamp = Date.now();
    grabbedAnimations = grabbedAnimations.filter((animation) => {
      const isLabelAnimation = animation.id.startsWith("label-");
      if (interpolateBounds(animation, selectionLerpForFrame, false)) {
        shouldContinueAnimating = true;
      }

      if (isLabelAnimation && animation.targetOpacity === 0) {
        if (animation.fadeStartTimestamp === null) {
          animation.fadeStartTimestamp = currentFrameTimestamp;
        }
        const labelElapsedMs = currentFrameTimestamp - animation.fadeStartTimestamp;
        const labelProgress = Math.min(1, labelElapsedMs / FADE_DURATION_MS);
        const labelEaseOut = 1 - (1 - labelProgress) * (1 - labelProgress);
        animation.opacity = Math.max(0, 1 - labelEaseOut);
        if (labelProgress >= 1) return false;
        shouldContinueAnimating = true;
        return true;
      }
      if (isLabelAnimation) {
        animation.fadeStartTimestamp = null;
      }

      if (animation.createdAt !== undefined) {
        const elapsedMs = currentTimestamp - animation.createdAt;
        const fadeOutDeadlineMs = FEEDBACK_DURATION_MS + FADE_DURATION_MS;
        if (elapsedMs >= fadeOutDeadlineMs) return false;
        if (elapsedMs > FEEDBACK_DURATION_MS) {
          const fadeProgress = Math.min(1, (elapsedMs - FEEDBACK_DURATION_MS) / FADE_DURATION_MS);
          const easeOut = 1 - (1 - fadeProgress) * (1 - fadeProgress);
          animation.opacity = 1 - easeOut;
          shouldContinueAnimating = true;
        } else {
          const fadeDelayMs = FEEDBACK_DURATION_MS - elapsedMs;
          nextFadeDelayMs =
            nextFadeDelayMs === null ? fadeDelayMs : Math.min(nextFadeDelayMs, fadeDelayMs);
        }
        return true;
      }
      if (isLabelAnimation) return true;
      return animation.opacity > 0;
    });

    render();
    if (shouldContinueAnimating) {
      animationFrameId = options.scheduler.requestFrame(runAnimationFrame);
      return;
    }

    animationFrameId = null;
    previousFrameTimestamp = null;
    if (nextFadeDelayMs !== null) {
      fadeWakeTimeoutId = options.scheduler.setTimeout(
        () => {
          fadeWakeTimeoutId = null;
          scheduleAnimationFrame();
        },
        Math.max(0, nextFadeDelayMs),
      );
    }
  };

  const updateSelection = (nextState: OverlayCanvasSelectionState) => {
    state.selection = nextState;
    const boundsToRender =
      nextState.boundsMultiple && nextState.boundsMultiple.length > 0
        ? nextState.boundsMultiple
        : nextState.bounds
          ? [nextState.bounds]
          : [];
    if (!nextState.isVisible || boundsToRender.length === 0) {
      selectionAnimations = [];
      scheduleAnimationFrame();
      return;
    }

    const existingSelectionById = new Map<string, AnimatedBounds>();
    for (const animation of selectionAnimations) {
      existingSelectionById.set(animation.id, animation);
    }
    selectionAnimations = boundsToRender.map((bounds, index) => {
      const animationId = `selection-${index}`;
      const existingAnimation = existingSelectionById.get(animationId);
      if (!existingAnimation) return createAnimatedBounds(animationId, bounds);
      updateAnimationTarget(existingAnimation, bounds);
      if (nextState.shouldSnap) {
        existingAnimation.current.x = existingAnimation.target.x;
        existingAnimation.current.y = existingAnimation.target.y;
        existingAnimation.current.width = existingAnimation.target.width;
        existingAnimation.current.height = existingAnimation.target.height;
      }
      return existingAnimation;
    });
    scheduleAnimationFrame();
  };

  const updateDrag = (nextState: OverlayCanvasDragState) => {
    state.drag = nextState;
    if (!nextState.isVisible || !nextState.bounds) {
      dragAnimation = null;
      scheduleAnimationFrame();
      return;
    }
    if (dragAnimation) {
      updateAnimationTarget(dragAnimation, nextState.bounds);
    } else {
      dragAnimation = createAnimatedBounds("drag", nextState.bounds);
    }
    scheduleAnimationFrame();
  };

  const updateGrabbed = (nextState: OverlayCanvasGrabbedState) => {
    state.grabbed = nextState;
    const boxesById = new Map<string, OverlayCanvasGrabbedBox>();
    for (const box of nextState.boxes) {
      boxesById.set(box.id, box);
    }

    // Build one id→animation index up-front so the per-instance lookups
    // below are O(1). The previous .find() inside a for-loop produced
    // O(boxes × animations) and O(labels × animations) hot work, both
    // of which grow with multi-select.
    const animationsById = new Map<string, AnimatedBounds>();
    for (const animation of grabbedAnimations) {
      animationsById.set(animation.id, animation);
    }
    for (const box of nextState.boxes) {
      const existingAnimation = animationsById.get(box.id);
      if (existingAnimation) {
        updateAnimationTarget(existingAnimation, box.bounds);
      } else {
        const newAnimation = createAnimatedBounds(box.id, box.bounds, {
          createdAt: box.createdAt,
        });
        grabbedAnimations.push(newAnimation);
        animationsById.set(box.id, newAnimation);
      }
    }

    const activeLabelIds = new Set<string>();
    for (const label of nextState.labels) {
      const boundsToRender = label.boundsMultiple ?? [label.bounds];
      const targetOpacity = label.isFading ? 0 : 1;
      for (let index = 0; index < boundsToRender.length; index++) {
        const bounds = boundsToRender[index];
        const animationId = `label-${label.id}-${index}`;
        activeLabelIds.add(animationId);
        const existingAnimation = animationsById.get(animationId);
        if (existingAnimation) {
          updateAnimationTarget(existingAnimation, bounds, targetOpacity);
        } else {
          const newAnimation = createAnimatedBounds(animationId, bounds, {
            opacity: 1,
            targetOpacity,
          });
          grabbedAnimations.push(newAnimation);
          animationsById.set(animationId, newAnimation);
        }
      }
    }

    // Boxes stay in the store for their full fade-out, so an animation
    // whose box is gone was cleared explicitly (reset/escape) and must
    // not linger — an orphaned remnant can't track layout shifts and
    // would freeze at stale coordinates.
    grabbedAnimations = grabbedAnimations.filter((animation) =>
      animation.id.startsWith("label-")
        ? activeLabelIds.has(animation.id)
        : boxesById.has(animation.id),
    );
    scheduleAnimationFrame();
  };

  const destroy = () => {
    if (animationFrameId !== null) options.scheduler.cancelFrame(animationFrameId);
    if (fadeWakeTimeoutId !== null) options.scheduler.clearTimeout(fadeWakeTimeoutId);
    animationFrameId = null;
    fadeWakeTimeoutId = null;
  };

  resize(canvasWidth, canvasHeight, devicePixelRatio);
  updateSelection(state.selection);
  updateDrag(state.drag);
  updateGrabbed(state.grabbed);

  return { resize, updateSelection, updateDrag, updateGrabbed, destroy };
};
