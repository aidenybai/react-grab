import { createMemo, type Component } from "solid-js";
import type { SpringValue } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";

interface SpringVisualizationProps {
  value: SpringValue;
}

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 100;
const SAMPLE_COUNT = 60;
const VALUE_MIN = -0.3;
const VALUE_MAX = 1.55;

// Underdamped spring step response normalized to a target of 1. `bounce`
// maps to the damping ratio (0 = no overshoot, 1 = very springy) and
// `visualDuration` sets how quickly the curve rises and settles.
const springPosition = (timeSeconds: number, visualDuration: number, bounce: number): number => {
  const dampingRatio = clampToRange(1 - bounce * 0.85, 0.12, 1);
  const naturalFrequency = 6 / Math.max(visualDuration, 0.05);
  const decay = Math.exp(-dampingRatio * naturalFrequency * timeSeconds);
  if (dampingRatio >= 1) {
    return 1 - decay * (1 + naturalFrequency * timeSeconds);
  }
  const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
  return (
    1 -
    decay *
      (Math.cos(dampedFrequency * timeSeconds) +
        ((dampingRatio * naturalFrequency) / dampedFrequency) *
          Math.sin(dampedFrequency * timeSeconds))
  );
};

const toSvgY = (value: number): number =>
  VIEW_HEIGHT - ((value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * VIEW_HEIGHT;

export const SpringVisualization: Component<SpringVisualizationProps> = (props) => {
  const curvePath = createMemo(() => {
    const windowSeconds = Math.max(props.value.visualDuration * 1.8, 0.45);
    let path = "";
    for (let sampleIndex = 0; sampleIndex <= SAMPLE_COUNT; sampleIndex += 1) {
      const progress = sampleIndex / SAMPLE_COUNT;
      const value = springPosition(
        progress * windowSeconds,
        props.value.visualDuration,
        props.value.bounce,
      );
      const x = progress * VIEW_WIDTH;
      const y = toSvgY(value);
      path += `${sampleIndex === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    return path.trim();
  });

  return (
    <div class="relative w-full h-[52px] rounded-[6px] overflow-hidden bg-[var(--rg-surface-hover)]">
      <svg
        aria-hidden="true"
        class="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          x2={VIEW_WIDTH}
          y1={toSvgY(1)}
          y2={toSvgY(1)}
          stroke="var(--rg-border-subtle)"
          stroke-width="1"
          stroke-dasharray="3 3"
          vector-effect="non-scaling-stroke"
        />
        <path
          d={curvePath()}
          fill="none"
          stroke="var(--rg-text-primary)"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};
