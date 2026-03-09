export const DURATION = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

export const EASING = {
  linear: "linear",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const;

export type DurationKey = keyof typeof DURATION;
export type EasingKey = keyof typeof EASING;

export function transition(
  property: string | string[],
  duration: DurationKey = "normal",
  easing: EasingKey = "easeInOut",
): string {
  const props = Array.isArray(property) ? property : [property];
  return props
    .map((p) => `${p} ${DURATION[duration]}ms ${EASING[easing]}`)
    .join(", ");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function staggerDelay(index: number, baseDelay = 50): number {
  return index * baseDelay;
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.normal / 1000 },
};

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow / 1000, ease: [0.4, 0, 0.2, 1] },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: DURATION.normal / 1000, ease: [0.34, 1.56, 0.64, 1] },
};
