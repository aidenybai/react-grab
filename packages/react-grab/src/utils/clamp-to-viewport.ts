export const clampToViewport = (
  value: number,
  elementSize: number,
  viewportSize: number,
  padding: number,
): number =>
  Math.max(padding, Math.min(value, viewportSize - elementSize - padding));
