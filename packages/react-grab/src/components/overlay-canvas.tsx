import { createEffect, onCleanup, onMount, on } from "solid-js";
import type { Component } from "solid-js";
import type {
  OverlayBounds,
  SelectionLabelInstance,
  AgentSession,
} from "../types.js";
import { lerp } from "../utils/lerp.js";
import {
  SELECTION_LERP_FACTOR,
  SUCCESS_LABEL_DURATION_MS,
  CROSSHAIR_LERP_FACTOR,
  DRAG_LERP_FACTOR,
  LERP_CONVERGENCE_THRESHOLD_PX,
  FADE_OUT_BUFFER_MS,
  MIN_DEVICE_PIXEL_RATIO,
  Z_INDEX_OVERLAY_CANVAS,
} from "../constants.js";

const CROSSHAIR_COLOR = "rgba(210, 57, 192, 1)";

const LAYER_STYLES = {
  drag: {
    borderColor: "rgba(210, 57, 192, 0.4)",
    fillColor: "rgba(210, 57, 192, 0.05)",
    lerpFactor: DRAG_LERP_FACTOR,
  },
  selection: {
    borderColor: "rgba(210, 57, 192, 0.5)",
    fillColor: "rgba(210, 57, 192, 0.08)",
    lerpFactor: SELECTION_LERP_FACTOR,
  },
  grabbed: {
    borderColor: "rgba(210, 57, 192, 0.5)",
    fillColor: "rgba(210, 57, 192, 0.08)",
    lerpFactor: SELECTION_LERP_FACTOR,
  },
  processing: {
    borderColor: "rgba(210, 57, 192, 0.5)",
    fillColor: "rgba(210, 57, 192, 0.08)",
    lerpFactor: SELECTION_LERP_FACTOR,
  },
} as const;

type LayerName = "crosshair" | "drag" | "selection" | "grabbed" | "processing";

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
  createdAt?: number;
  isInitialized: boolean;
}

interface Position {
  x: number;
  y: number;
}

export interface OverlayCanvasProps {
  crosshairVisible?: boolean;
  mouseX?: number;
  mouseY?: number;

  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionBoundsMultiple?: OverlayBounds[];
  selectionIsFading?: boolean;

  dragVisible?: boolean;
  dragBounds?: OverlayBounds;

  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;

  agentSessions?: Map<string, AgentSession>;

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
    crosshair: { canvas: null, context: null },
    drag: { canvas: null, context: null },
    selection: { canvas: null, context: null },
    grabbed: { canvas: null, context: null },
    processing: { canvas: null, context: null },
  };

  const crosshairCurrentPosition: Position = { x: 0, y: 0 };
  const crosshairTargetPosition: Position = { x: 0, y: 0 };
  let isCrosshairInitialized = false;

  let selectionAnimations: AnimatedBounds[] = [];
  let dragAnimation: AnimatedBounds | null = null;
  let grabbedAnimations: AnimatedBounds[] = [];
  let processingAnimations: AnimatedBounds[] = [];

  const createOffscreenLayer = (
    layerWidth: number,
    layerHeight: number,
    scaleFactor: number,
  ): OffscreenLayer => {
    const canvas = new OffscreenCanvas(
      layerWidth * scaleFactor,
      layerHeight * scaleFactor,
    );
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(scaleFactor, scaleFactor);
    }
    return { canvas, context };
  };

  const initializeCanvas = () => {
    if (!canvasRef) return;

    devicePixelRatio = Math.max(
      window.devicePixelRatio || 1,
      MIN_DEVICE_PIXEL_RATIO,
    );
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvasRef.width = canvasWidth * devicePixelRatio;
    canvasRef.height = canvasHeight * devicePixelRatio;
    canvasRef.style.width = `${canvasWidth}px`;
    canvasRef.style.height = `${canvasHeight}px`;

    mainContext = canvasRef.getContext("2d");
    if (mainContext) {
      mainContext.scale(devicePixelRatio, devicePixelRatio);
    }

    for (const layerName of Object.keys(layers) as LayerName[]) {
      layers[layerName] = createOffscreenLayer(
        canvasWidth,
        canvasHeight,
        devicePixelRatio,
      );
    }
  };

  const parseBorderRadiusValue = (borderRadius: string): number => {
    if (!borderRadius) return 0;
    const match = borderRadius.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

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
      context.roundRect(
        rectX,
        rectY,
        rectWidth,
        rectHeight,
        clampedCornerRadius,
      );
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

  const renderCrosshairLayer = () => {
    const layer = layers.crosshair;
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!props.crosshairVisible) return;

    context.strokeStyle = CROSSHAIR_COLOR;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(crosshairCurrentPosition.x, 0);
    context.lineTo(crosshairCurrentPosition.x, canvasHeight);
    context.moveTo(0, crosshairCurrentPosition.y);
    context.lineTo(canvasWidth, crosshairCurrentPosition.y);
    context.stroke();
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

  const renderGrabbedLayer = () => {
    const layer = layers.grabbed;
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const style = LAYER_STYLES.grabbed;

    for (const animation of grabbedAnimations) {
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

  const renderProcessingLayer = () => {
    const layer = layers.processing;
    if (!layer.context) return;

    const context = layer.context;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const style = LAYER_STYLES.processing;

    for (const animation of processingAnimations) {
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

    renderCrosshairLayer();
    renderDragLayer();
    renderSelectionLayer();
    renderGrabbedLayer();
    renderProcessingLayer();

    const layerRenderOrder: LayerName[] = [
      "crosshair",
      "drag",
      "selection",
      "grabbed",
      "processing",
    ];
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
  ): boolean => {
    const lerpedX = lerp(animation.current.x, animation.target.x, lerpFactor);
    const lerpedY = lerp(animation.current.y, animation.target.y, lerpFactor);
    const lerpedWidth = lerp(
      animation.current.width,
      animation.target.width,
      lerpFactor,
    );
    const lerpedHeight = lerp(
      animation.current.height,
      animation.target.height,
      lerpFactor,
    );

    const hasConverged =
      Math.abs(lerpedX - animation.target.x) < LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedY - animation.target.y) < LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedWidth - animation.target.width) <
        LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedHeight - animation.target.height) <
        LERP_CONVERGENCE_THRESHOLD_PX;

    animation.current.x = hasConverged ? animation.target.x : lerpedX;
    animation.current.y = hasConverged ? animation.target.y : lerpedY;
    animation.current.width = hasConverged
      ? animation.target.width
      : lerpedWidth;
    animation.current.height = hasConverged
      ? animation.target.height
      : lerpedHeight;

    return !hasConverged;
  };

  const runAnimationFrame = () => {
    let shouldContinueAnimating = false;

    if (props.crosshairVisible) {
      const lerpedX = lerp(
        crosshairCurrentPosition.x,
        crosshairTargetPosition.x,
        CROSSHAIR_LERP_FACTOR,
      );
      const lerpedY = lerp(
        crosshairCurrentPosition.y,
        crosshairTargetPosition.y,
        CROSSHAIR_LERP_FACTOR,
      );

      const hasXConverged =
        Math.abs(lerpedX - crosshairTargetPosition.x) <
        LERP_CONVERGENCE_THRESHOLD_PX;
      const hasYConverged =
        Math.abs(lerpedY - crosshairTargetPosition.y) <
        LERP_CONVERGENCE_THRESHOLD_PX;

      crosshairCurrentPosition.x = hasXConverged
        ? crosshairTargetPosition.x
        : lerpedX;
      crosshairCurrentPosition.y = hasYConverged
        ? crosshairTargetPosition.y
        : lerpedY;

      if (!hasXConverged || !hasYConverged) {
        shouldContinueAnimating = true;
      }
    }

    if (dragAnimation?.isInitialized) {
      if (interpolateBounds(dragAnimation, LAYER_STYLES.drag.lerpFactor)) {
        shouldContinueAnimating = true;
      }
    }

    for (const animation of selectionAnimations) {
      if (animation.isInitialized) {
        if (
          interpolateBounds(animation, LAYER_STYLES.selection.lerpFactor)
        ) {
          shouldContinueAnimating = true;
        }
      }
    }

    const currentTimestamp = Date.now();
    grabbedAnimations = grabbedAnimations.filter((animation) => {
      if (animation.isInitialized) {
        if (interpolateBounds(animation, LAYER_STYLES.grabbed.lerpFactor)) {
          shouldContinueAnimating = true;
        }
      }

      if (
        animation.createdAt &&
        currentTimestamp - animation.createdAt > SUCCESS_LABEL_DURATION_MS
      ) {
        animation.opacity = 0;
      }

      if (animation.opacity > 0) {
        const fadeOutDeadline =
          SUCCESS_LABEL_DURATION_MS + FADE_OUT_BUFFER_MS;
        if (
          animation.createdAt &&
          currentTimestamp - animation.createdAt < fadeOutDeadline
        ) {
          shouldContinueAnimating = true;
        }
        return true;
      }
      return false;
    });

    for (const animation of processingAnimations) {
      if (animation.isInitialized) {
        if (
          interpolateBounds(animation, LAYER_STYLES.processing.lerpFactor)
        ) {
          shouldContinueAnimating = true;
        }
      }
    }

    compositeAllLayers();

    if (shouldContinueAnimating) {
      animationFrameId = requestAnimationFrame(runAnimationFrame);
    } else {
      animationFrameId = null;
    }
  };

  const scheduleAnimationFrame = () => {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(runAnimationFrame);
  };

  const handleWindowResize = () => {
    initializeCanvas();
    scheduleAnimationFrame();
  };

  createEffect(
    on(
      () => [props.mouseX, props.mouseY] as const,
      ([mouseX, mouseY]) => {
        const targetX = mouseX ?? 0;
        const targetY = mouseY ?? 0;

        if (!isCrosshairInitialized) {
          crosshairCurrentPosition.x = targetX;
          crosshairCurrentPosition.y = targetY;
          isCrosshairInitialized = true;
        }

        crosshairTargetPosition.x = targetX;
        crosshairTargetPosition.y = targetY;
        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => props.crosshairVisible,
      () => {
        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () =>
        [
          props.selectionVisible,
          props.selectionBounds,
          props.selectionBoundsMultiple,
          props.selectionIsFading,
        ] as const,
      ([isVisible, singleBounds, multipleBounds]) => {
        if (
          !isVisible ||
          (!singleBounds &&
            (!multipleBounds || multipleBounds.length === 0))
        ) {
          selectionAnimations = [];
          scheduleAnimationFrame();
          return;
        }

        const boundsToRender =
          multipleBounds && multipleBounds.length > 0
            ? multipleBounds
            : singleBounds
              ? [singleBounds]
              : [];

        selectionAnimations = boundsToRender.map((bounds, index) => {
          const animationId = `selection-${index}`;
          const existingAnimation = selectionAnimations.find(
            (animation) => animation.id === animationId,
          );
          const cornerRadius = parseBorderRadiusValue(bounds.borderRadius);

          if (existingAnimation) {
            existingAnimation.target = {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            };
            existingAnimation.borderRadius = cornerRadius;
            return existingAnimation;
          }

          return {
            id: animationId,
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
            borderRadius: cornerRadius,
            opacity: 1,
            isInitialized: true,
          };
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

        const cornerRadius = parseBorderRadiusValue(bounds.borderRadius);

        if (dragAnimation) {
          dragAnimation.target = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          };
          dragAnimation.borderRadius = cornerRadius;
        } else {
          dragAnimation = {
            id: "drag",
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
            borderRadius: cornerRadius,
            opacity: 1,
            isInitialized: true,
          };
        }

        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => props.grabbedBoxes,
      (grabbedBoxes) => {
        const boxesToProcess = grabbedBoxes ?? [];
        const existingAnimationIds = new Set(
          grabbedAnimations.map((animation) => animation.id),
        );

        for (const box of boxesToProcess) {
          if (!existingAnimationIds.has(box.id)) {
            const cornerRadius = parseBorderRadiusValue(box.bounds.borderRadius);
            grabbedAnimations.push({
              id: box.id,
              current: {
                x: box.bounds.x,
                y: box.bounds.y,
                width: box.bounds.width,
                height: box.bounds.height,
              },
              target: {
                x: box.bounds.x,
                y: box.bounds.y,
                width: box.bounds.width,
                height: box.bounds.height,
              },
              borderRadius: cornerRadius,
              opacity: 1,
              createdAt: box.createdAt,
              isInitialized: true,
            });
          }
        }

        for (const animation of grabbedAnimations) {
          const matchingBox = boxesToProcess.find(
            (box) => box.id === animation.id,
          );
          if (matchingBox) {
            const cornerRadius = parseBorderRadiusValue(
              matchingBox.bounds.borderRadius,
            );
            animation.target = {
              x: matchingBox.bounds.x,
              y: matchingBox.bounds.y,
              width: matchingBox.bounds.width,
              height: matchingBox.bounds.height,
            };
            animation.borderRadius = cornerRadius;
          }
        }

        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => props.agentSessions,
      (agentSessions) => {
        if (!agentSessions || agentSessions.size === 0) {
          processingAnimations = [];
          scheduleAnimationFrame();
          return;
        }

        const updatedAnimations: AnimatedBounds[] = [];

        for (const [sessionId, session] of agentSessions) {
          for (let index = 0; index < session.selectionBounds.length; index++) {
            const bounds = session.selectionBounds[index];
            const animationId = `processing-${sessionId}-${index}`;
            const existingAnimation = processingAnimations.find(
              (animation) => animation.id === animationId,
            );
            const cornerRadius = parseBorderRadiusValue(bounds.borderRadius);

            if (existingAnimation) {
              existingAnimation.target = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
              };
              existingAnimation.borderRadius = cornerRadius;
              updatedAnimations.push(existingAnimation);
            } else {
              updatedAnimations.push({
                id: animationId,
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
                borderRadius: cornerRadius,
                opacity: 1,
                isInitialized: true,
              });
            }
          }
        }

        processingAnimations = updatedAnimations;
        scheduleAnimationFrame();
      },
    ),
  );

  createEffect(
    on(
      () => props.labelInstances,
      (labelInstances) => {
        const instancesToProcess = labelInstances ?? [];

        for (const instance of instancesToProcess) {
          const boundsToRender = instance.boundsMultiple ?? [instance.bounds];

          for (let index = 0; index < boundsToRender.length; index++) {
            const bounds = boundsToRender[index];
            const animationId = `label-${instance.id}-${index}`;
            const existingAnimation = grabbedAnimations.find(
              (animation) => animation.id === animationId,
            );
            const cornerRadius = parseBorderRadiusValue(bounds.borderRadius);
            const shouldFade = instance.status === "fading";

            if (existingAnimation) {
              existingAnimation.target = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
              };
              existingAnimation.borderRadius = cornerRadius;
              existingAnimation.opacity = shouldFade ? 0 : 1;
            } else {
              grabbedAnimations.push({
                id: animationId,
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
                borderRadius: cornerRadius,
                opacity: shouldFade ? 0 : 1,
                isInitialized: true,
              });
            }
          }
        }

        const activeLabelIds = new Set<string>();
        for (const instance of instancesToProcess) {
          const boundsToRender = instance.boundsMultiple ?? [instance.bounds];
          for (let index = 0; index < boundsToRender.length; index++) {
            activeLabelIds.add(`label-${instance.id}-${index}`);
          }
        }

        grabbedAnimations = grabbedAnimations.filter((animation) => {
          if (animation.id.startsWith("label-")) {
            return activeLabelIds.has(animation.id);
          }
          return true;
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
      const newDevicePixelRatio = Math.max(
        window.devicePixelRatio || 1,
        MIN_DEVICE_PIXEL_RATIO,
      );
      if (newDevicePixelRatio !== devicePixelRatio) {
        handleWindowResize();
        setupDprMediaQuery();
      }
    };

    const setupDprMediaQuery = () => {
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener(
          "change",
          handleDevicePixelRatioChange,
        );
      }
      currentDprMediaQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      currentDprMediaQuery.addEventListener(
        "change",
        handleDevicePixelRatioChange,
      );
    };

    setupDprMediaQuery();

    onCleanup(() => {
      window.removeEventListener("resize", handleWindowResize);
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener(
          "change",
          handleDevicePixelRatioChange,
        );
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
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
