export const getExpandGridClass = (
  isVertical: boolean,
  isExpanded: boolean,
  collapsedExtra?: string,
): string => {
  if (isExpanded) {
    return isVertical
      ? "grid-rows-[1fr] opacity-100"
      : "grid-cols-[1fr] opacity-100";
  }
  const base = isVertical
    ? "grid-rows-[0fr] opacity-0"
    : "grid-cols-[0fr] opacity-0";
  return collapsedExtra ? `${base} ${collapsedExtra}` : base;
};

export const getButtonSpacingClass = (isVertical: boolean): string =>
  isVertical ? "mb-1.5" : "mr-1.5";

export const getMinDimensionClass = (isVertical: boolean): string =>
  isVertical ? "min-h-0" : "min-w-0";

export const getHitboxConstraintClass = (isVertical: boolean): string =>
  isVertical ? "before:!min-h-full" : "before:!min-w-full";
