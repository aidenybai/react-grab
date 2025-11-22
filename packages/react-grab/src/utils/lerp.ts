export const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};
