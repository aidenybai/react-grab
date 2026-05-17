export const getButtonSpacingClass = (isVertical: boolean): string =>
  isVertical ? "mb-1.5" : "mr-1.5";

export const getMinDimensionClass = (isVertical: boolean): string =>
  isVertical ? "min-h-0" : "min-w-0";
