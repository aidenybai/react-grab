import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import { lerp } from "../utils/lerp.js";

interface UseAnimatedPositionOptions {
  x: Accessor<number>;
  y: Accessor<number>;
  lerpFactor?: number;
  convergenceThreshold?: number;
}

export const useAnimatedPosition = (options: UseAnimatedPositionOptions) => {
  const lerpFactor = options.lerpFactor ?? 0.3;
  const convergenceThreshold = options.convergenceThreshold ?? 0.5;

  const [x, setX] = createSignal(options.x());
  const [y, setY] = createSignal(options.y());
  let targetX = options.x();
  let targetY = options.y();
  let animationFrameId: number | null = null;
  let hasBeenRenderedOnce = false;

  const animate = () => {
    const currentX = lerp(x(), targetX, lerpFactor);
    const currentY = lerp(y(), targetY, lerpFactor);

    setX(currentX);
    setY(currentY);

    const hasConverged =
      Math.abs(currentX - targetX) < convergenceThreshold &&
      Math.abs(currentY - targetY) < convergenceThreshold;

    if (!hasConverged) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };

  const startAnimation = () => {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(animate);
  };

  createEffect(() => {
    targetX = options.x();
    targetY = options.y();

    if (!hasBeenRenderedOnce) {
      setX(targetX);
      setY(targetY);
      hasBeenRenderedOnce = true;
      return;
    }

    startAnimation();
  });

  onCleanup(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });

  return { x, y };
};

