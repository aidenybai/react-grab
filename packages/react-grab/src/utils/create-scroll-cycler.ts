interface ScrollCyclerOptions {
  thresholdPx: number;
  throttleMs: number;
  lineHeightPx: number;
  onStep: (direction: "forward" | "backward") => void;
}

interface ScrollCycler {
  handleWheel: (event: WheelEvent) => void;
}

export const createScrollCycler = (
  options: ScrollCyclerOptions,
): ScrollCycler => {
  const { thresholdPx, throttleMs, lineHeightPx, onStep } = options;

  let accumulatedDelta = 0;
  let currentDirection: number | null = null;
  let lastStepTimestamp = 0;

  const handleWheel = (event: WheelEvent) => {
    const primaryAxisDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (primaryAxisDelta === 0) return;

    let normalizedDelta = primaryAxisDelta;
    if (event.deltaMode === 1) {
      normalizedDelta *= lineHeightPx;
    } else if (event.deltaMode === 2) {
      normalizedDelta *= window.innerHeight;
    }

    const direction = normalizedDelta > 0 ? 1 : -1;
    if (currentDirection !== direction) {
      currentDirection = direction;
      accumulatedDelta = 0;
    }

    accumulatedDelta += Math.abs(normalizedDelta);

    const now = Date.now();
    if (
      now - lastStepTimestamp < throttleMs ||
      accumulatedDelta < thresholdPx
    ) {
      return;
    }

    accumulatedDelta -= thresholdPx;
    lastStepTimestamp = now;

    onStep(direction < 0 ? "backward" : "forward");
  };

  return { handleWheel };
};
