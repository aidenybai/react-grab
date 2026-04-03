import { createEffect, onCleanup, onMount, on } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds, SelectionLabelInstance } from "../types.js";
import { lerp } from "../utils/lerp.js";
import {
  SELECTION_LERP_FACTOR,
  FEEDBACK_DURATION_MS,
  DRAG_LERP_FACTOR,
  LERP_CONVERGENCE_THRESHOLD_PX,
  FADE_OUT_BUFFER_MS,
  MIN_DEVICE_PIXEL_RATIO,
  Z_INDEX_OVERLAY_CANVAS,
  OVERLAY_BORDER_COLOR_DRAG,
  OVERLAY_FILL_COLOR_DRAG,
  OPACITY_CONVERGENCE_THRESHOLD,
  OVERLAY_BORDER_COLOR_DEFAULT,
  OVERLAY_FILL_COLOR_DEFAULT,
  OVERLAY_BORDER_COLOR_INSPECT,
  OVERLAY_FILL_COLOR_INSPECT,
} from "../constants.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { supportsDisplayP3 } from "../utils/supports-display-p3.js";

const DEFAULT_LAYER_STYLE = {
  borderColor: OVERLAY_BORDER_COLOR_DEFAULT,
  fillColor: OVERLAY_FILL_COLOR_DEFAULT,
  lerpFactor: SELECTION_LERP_FACTOR,
} as const;

const INSPECT_LAYER_STYLE = {
  borderColor: OVERLAY_BORDER_COLOR_INSPECT,
  fillColor: OVERLAY_FILL_COLOR_INSPECT,
  lerpFactor: SELECTION_LERP_FACTOR,
} as const;

const LAYER_STYLES = {
  drag: {
    borderColor: OVERLAY_BORDER_COLOR_DRAG,
    fillColor: OVERLAY_FILL_COLOR_DRAG,
    lerpFactor: DRAG_LERP_FACTOR,
  },
  selection: DEFAULT_LAYER_STYLE,
  grabbed: DEFAULT_LAYER_STYLE,
  inspect: INSPECT_LAYER_STYLE,
} as const;

type LayerName = "drag" | "selection" | "grabbed" | "inspect";

interface OffscreenLayer {
  canvas: OffscreenCanvas | null;
  context: OffscreenCanvasRenderingContext2D | null;
}

interface AnimatedBounds {
  id: string;
  current: { x: number; y: number; width: number; height: number };
  target: { x: number; y: number; width: number; height: number };
  borderRadius: number;
  opacity: number;
  targetOpacity: number;
  createdAt?: number;
  isInitialized: boolean;
}

interface OverlayCanvasProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionBoundsMultiple?: OverlayBounds[];
  selectionIsFading?: boolean;
  selectionShouldSnap?: boolean;

  inspectVisible?: boolean;
  inspectBounds?: OverlayBounds[];

  dragVisible?: boolean;
  dragBounds?: OverlayBounds;

  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;

  labelInstances?: SelectionLabelInstance[];
}

export const OverlayCanvas: Component<OverlayCanvasProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let mainContext: CanvasRenderingContext2D | null = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let devicePixelRatio = 1;
  let animationFrameId: number | null = null;

  const layers: Record<LayerName, OffscreenLayer> = {
    drag: { canvas: null, context: null },
    selection: { canvas: null, context: null },
    grabbed: { canvas: null, context: null },
    inspect: { canvas: null, context: null },
  };

  let selectionAnimations: AnimatedBounds[] = [];
  let dragAnimation: AnimatedBounds | null = null;
  let grabbedAnimations: AnimatedBounds[] = [];
  let inspectAnimations: AnimatedBounds[] = [];

  const canvasColorSpace: PredefinedColorSpace = supportsDisplayP3() ? "display-p3" : "srgb";

  const createOffscreenLayer = (
    layerWidth: number,
    layerHeight: number,
    scaleFactor: number,
  ): OffscreenLayer => {
    const canvas = new OffscreenCanvas(layerWidth * scaleFactor, layerHeight * scaleFactor);
    const context = canvas.getContext("2d", { colorSpace: canvasColorSpace });
    if (context) {
      context.scale(scaleFactor, scaleFactor);
    }
    return { canvas, context };
  };

  const initializeCanvas = () => {
    if (!canvasRef) return;

    devicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasRef.width = canvasWidth * devicePixelRatio;
    canvasRef.height = canvasHeight * devicePixelRatio;
    canvasRef.style.width = `${canvasWidth}px`;
    canvasRef.style.height = `${canvasHeight}px`;

    mainContext = canvasRef.getContext("2d", { colorSpace: canvasColorSpace });
    if (mainContext) {
      mainContext.scale(devicePixelRatio, devicePixelRatio);
    }

    for (const layerName of Object.keys(layers) as LayerName[]) {
      layers[layerName] = createOffscreenLayer(canvasWidth, canvasHeight, devicePixelRatio);
    }
  };

  const parseBorderRadiusValue = (borderRadius: string): number => {
    if (!borderRadius) return 0;
    const match = borderRadius.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const createAnimatedBounds = (
    id: string,
    bounds: OverlayBounds,
    options?: { createdAt?: number; opacity?: number; targetOpacity?: number },
  ): AnimatedBounds => ({
    id,
    current: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    target: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    borderRadius: parseBorderRadiusValue(bounds.borderRadius),
    opacity: options?.opacity ?? 1,
    targetOpacity: options?.targetOpacity ?? options?.opacity ?? 1,
    createdAt: options?.createdAt,
    isInitialized: true,
  });

  const updateAnimationTarget = (
    animation: AnimatedBounds,
    bounds: OverlayBounds,
    targetOpacity?: number,
  ) => {
    animation.target = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
    animation.borderRadius = parseBorderRadiusValue(bounds.borderRadius);
    if (targetOpacity !== undefined) {
      animation.targetOpacity = targetOpacity;
    }
  };

  const resolveBoundsArray = (instance: SelectionLabelInstance): OverlayBounds[] =>
    instance.boundsMultiple ?? [instance.bounds];

  const drawRoundedRectangle = (
    context: OffscreenCanvasRenderingContext2D,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    cornerRadius: number,
    fillColor: string,
    strokeColor: string,
    opacity: number = 1,
  ) => {
    if (rectWidth <= 0 || rectHeight <= 0) return;

    const maxCornerRadius = Math.min(rectWidth / 2, rectHeight / 2);
    const clampedCornerRadius = Math.min(cornerRadius, maxCornerRadius);

    context.globalAlpha = opacity;
    context.beginPath();
    if (clampedCornerRadius > 0) {
      context.roundRect(rectX, rectY, rectWidth, rectHeight, clampedCornerRadius);
    } else {
      context.rect(rectX, rectY, rectWidth, rectHeight);
    }
    context.fillStyle = fillColor;
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = 1;
    context.stroke();
    context.globalAlpha = 1;
  };

  const renderDragLayer = () => {
    const layer = layers.drag;
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!props.dragVisible || !dragAnimation) return;

    const style = LAYER_STYLES.drag;
    drawRoundedRectangle(
      context,
      dragAnimation.current.x,
      dragAnimation.current.y,
      dragAnimation.current.width,
      dragAnimation.current.height,
      dragAnimation.borderRadius,
      style.fillColor,
      style.borderColor,
    );
  };

  const renderSelectionLayer = () => {
    const layer = layers.selection;
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!props.selectionVisible) return;

    const style = LAYER_STYLES.selection;

    for (const animation of selectionAnimations) {
      const effectiveOpacity = props.selectionIsFading ? 0 : animation.opacity;
      drawRoundedRectangle(
        context,
        animation.current.x,
        animation.current.y,
        animation.current.width,
        animation.current.height,
        animation.borderRadius,
        style.fillColor,
        style.borderColor,
        effectiveOpacity,
      );
    }
  };

  const renderBoundsLayer = (
    layerName: keyof typeof LAYER_STYLES,
    animations: AnimatedBounds[],
  ) => {
    const layer = layers[layerName];
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const style = LAYER_STYLES[layerName];

    for (const animation of animations) {
      drawRoundedRectangle(
        context,
        animation.current.x,
        animation.current.y,
        animation.current.width,
        animation.current.height,
        animation.borderRadius,
        style.fillColor,
        style.borderColor,
        animation.opacity,
      );
    }
  };

  const compositeAllLayers = () => {
    if (!mainContext || !canvasRef) return;

    mainContext.setTransform(1, 0, 0, 1, 0, 0);
    mainContext.clearRect(0, 0, canvasRef.width, canvasRef.height);
    mainContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    renderDragLayer();
    renderSelectionLayer();
    renderBoundsLayer("grabbed", grabbedAnimations);
    renderBoundsLayer("inspect", inspectAnimations);

    const layerRenderOrder: LayerName[] = ["inspect", "drag", "selection", "grabbed"];
    for (const layerName of layerRenderOrder) {
      const layer = layers[layerName];
      if (layer.canvas) {
        mainContext.drawImage(layer.canvas, 0, 0, canvasWidth, canvasHeight);
      }
    }
  };

  const interpolateBounds = (
    animation: AnimatedBounds,
    lerpFactor: number,
    options?: { interpolateOpacity?: boolean },
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

    let hasOpacityConverged = true;
    if (options?.interpolateOpacity) {
      const lerpedOpacity = lerp(animation.opacity, animation.targetOpacity, lerpFactor);
      hasOpacityConverged =
        Math.abs(lerpedOpacity - animation.targetOpacity) < OPACITY_CONVERGENCE_THRESHOLD;
      animation.opacity = hasOpacityConverged ? animation.targetOpacity : lerpedOpacity;
    }

    return !hasBoundsConverged || !hasOpacityConverged;
  };

  const runAnimationFrame = () => {
    let shouldContinueAnimating = false;

    if (dragAnimation?.isInitialized) {
      if (interpolateBounds(dragAnimation, LAYER_STYLES.drag.lerpFactor)) {
        shouldContinueAnimating = true;
      }
    }

    for (const animation of selectionAnimations) {
      if (animation.isInitialized) {
        if (interpolateBounds(animation, LAYER_STYLES.selection.lerpFactor)) {
          shouldContinueAnimating = true;
        }
      }
    }

    const currentTimestamp = Date.now();
    grabbedAnimations = grabbedAnimations.filter((animation) => {
      const isLabelAnimation = animation.id.startsWith("label-");

      if (animation.isInitialized) {
        const isStillAnimating = interpolateBounds(animation, LAYER_STYLES.grabbed.lerpFactor, {
          interpolateOpacity: isLabelAnimation,
        });
        if (isStillAnimating) {
          shouldContinueAnimating = true;
        }
      }

      if (animation.createdAt) {
        const elapsed = currentTimestamp - animation.createdAt;
        const fadeOutDeadline = FEEDBACK_DURATION_MS + FADE_OUT_BUFFER_MS;

        if (elapsed >= fadeOutDeadline) {
          return false;
        }

        if (elapsed > FEEDBACK_DURATION_MS) {
          const fadeProgress = (elapsed - FEEDBACK_DURATION_MS) / FADE_OUT_BUFFER_MS;
          animation.opacity = 1 - fadeProgress;
          shouldContinueAnimating = true;
        }

        return true;
      }

      if (isLabelAnimation) {
        const hasOpacityConverged =
          Math.abs(animation.opacity - animation.targetOpacity) < OPACITY_CONVERGENCE_THRESHOLD;
        if (hasOpacityConverged && animation.targetOpacity === 0) {
          return false;
        }
        return true;
      }

      return animation.opacity > 0;
    });

    for (const animation of inspectAnimations) {
      if (animation.isInitialized) {
        if (interpolateBounds(animation, LAYER_STYLES.inspect.lerpFactor)) {
          shouldContinueAnimating = true;
        }
      }
    }

    compositeAllLayers();

    if (shouldContinueAnimating) {
      animationFrameId = nativeRequestAnimationFrame(runAnimationFrame);
    } else {
      animationFrameId = null;
    }
  };

  const scheduleAnimationFrame = () => {
    if (animationFrameId !== null) return;
    animationFrameId = nativeRequestAnimationFrame(runAnimationFrame);
  };

  const handleWindowResize = () => {
    initializeCanvas();
    scheduleAnimationFrame();
  };

  createEffect(
    on(
      () =>
        [
          props.selectionVisible,
          props.selectionBounds,
          props.selectionBoundsMultiple,
          props.selectionIsFading,
          props.selectionShouldSnap,
        ] as const,
      ([isVisible, singleBounds, multipleBounds, , shouldSnap]) => {
        if (!isVisible || (!singleBounds && (!multipleBounds || multipleBounds.length === 0))) {
          selectionAnimations = [];
          scheduleAnimationFrame();
          return;
        }

        let boundsToRender: readonly OverlayBounds[];
        if (multipleBounds && multipleBounds.length > 0) {
          boundsToRender = multipleBounds;
        } else if (singleBounds) {
          boundsToRender = [singleBounds];
        } else {
          boundsToRender = [];
        }

        selectionAnimations = boundsToRender.map((bounds, index) => {
          const animationId = `selection-${index}`;
          const existingAnimation = selectionAnimations.find(
            (animation) => animation.id === animationId,
          );

          if (existingAnimation) {
            updateAnimationTarget(existingAnimation, bounds);
            if (shouldSnap) {
              existingAnimation.current = { ...existingAnimation.target };
            }
            return existingAnimation;
          }

          return createAnimatedBounds(animationId, bounds);
        });

        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => [props.dragVisible, props.dragBounds] as const,
      ([isVisible, bounds]) => {
        if (!isVisible || !bounds) {
          dragAnimation = null;
          scheduleAnimationFrame();
          return;
        }

        if (dragAnimation) {
          updateAnimationTarget(dragAnimation, bounds);
        } else {
          dragAnimation = createAnimatedBounds("drag", bounds);
        }

        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => [props.grabbedBoxes, props.labelInstances] as const,
      ([grabbedBoxes, labelInstances]) => {
        const boxesToProcess = grabbedBoxes ?? [];
        const activeBoxIds = new Set(boxesToProcess.map((box) => box.id));
        const existingAnimationIds = new Set(grabbedAnimations.map((animation) => animation.id));

        for (const box of boxesToProcess) {
          if (!existingAnimationIds.has(box.id)) {
            grabbedAnimations.push(
              createAnimatedBounds(box.id, box.bounds, {
                createdAt: box.createdAt,
              }),
            );
          }
        }

        for (const animation of grabbedAnimations) {
          const matchingBox = boxesToProcess.find((box) => box.id === animation.id);
          if (matchingBox) {
            updateAnimationTarget(animation, matchingBox.bounds);
          }
        }

        const instancesToProcess = labelInstances ?? [];

        for (const instance of instancesToProcess) {
          const boundsToRender = resolveBoundsArray(instance);
          const targetOpacity = instance.status === "fading" ? 0 : 1;

          for (let index = 0; index < boundsToRender.length; index++) {
            const bounds = boundsToRender[index];
            const animationId = `label-${instance.id}-${index}`;
            const existingAnimation = grabbedAnimations.find(
              (animation) => animation.id === animationId,
            );

            if (existingAnimation) {
              updateAnimationTarget(existingAnimation, bounds, targetOpacity);
            } else {
              grabbedAnimations.push(
                createAnimatedBounds(animationId, bounds, {
                  opacity: 1,
                  targetOpacity,
                }),
              );
            }
          }
        }

        const activeLabelIds = new Set<string>();
        for (const instance of instancesToProcess) {
          const boundsToRender = resolveBoundsArray(instance);
          for (let index = 0; index < boundsToRender.length; index++) {
            activeLabelIds.add(`label-${instance.id}-${index}`);
          }
        }

        grabbedAnimations = grabbedAnimations.filter((animation) => {
          if (animation.id.startsWith("label-")) {
            return activeLabelIds.has(animation.id);
          }
          return activeBoxIds.has(animation.id);
        });

        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => [props.inspectVisible, props.inspectBounds] as const,
      ([isVisible, bounds]) => {
        if (!isVisible || !bounds || bounds.length === 0) {
          inspectAnimations = [];
          scheduleAnimationFrame();
          return;
        }

        inspectAnimations = bounds.map((ancestorBounds, index) => {
          const animationId = `inspect-${index}`;
          const existingAnimation = inspectAnimations.find(
            (animation) => animation.id === animationId,
          );

          if (existingAnimation) {
            updateAnimationTarget(existingAnimation, ancestorBounds);
            return existingAnimation;
          }

          return createAnimatedBounds(animationId, ancestorBounds);
        });

        scheduleAnimationFrame();
      },
    ),
  );

  onMount(() => {
    initializeCanvas();
    scheduleAnimationFrame();

    window.addEventListener("resize", handleWindowResize);

    let currentDprMediaQuery: MediaQueryList | null = null;

    const handleDevicePixelRatioChange = () => {
      const newDevicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
      if (newDevicePixelRatio !== devicePixelRatio) {
        handleWindowResize();
        setupDprMediaQuery();
      }
    };

    const setupDprMediaQuery = () => {
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener("change", handleDevicePixelRatioChange);
      }
      currentDprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      currentDprMediaQuery.addEventListener("change", handleDevicePixelRatioChange);
    };

    setupDprMediaQuery();

    onCleanup(() => {
      window.removeEventListener("resize", handleWindowResize);
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener("change", handleDevicePixelRatioChange);
      }
      if (animationFrameId !== null) {
        nativeCancelAnimationFrame(animationFrameId);
      }
    });
  });

  return (
    <canvas
      ref={canvasRef}
      data-react-grab-overlay-canvas
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        "pointer-events": "none",
        "z-index": String(Z_INDEX_OVERLAY_CANVAS),
      }}
    />
  );
};
