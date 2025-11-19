export const detectMobile = (): boolean => {
  if (typeof window === "undefined") return false;

  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const hasTouchMedia = window.matchMedia("(pointer: coarse)").matches;

  return hasTouchPoints || hasTouchMedia;
};





