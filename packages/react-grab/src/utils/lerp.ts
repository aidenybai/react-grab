export const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;
