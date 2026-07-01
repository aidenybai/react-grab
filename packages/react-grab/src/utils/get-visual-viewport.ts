import { getScopeContainer } from "./runtime-mode.js";

interface VisualViewportInfo {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export const getVisualViewport = (): VisualViewportInfo => {
  const scopeContainer = getScopeContainer();
  if (scopeContainer) {
    const rect = scopeContainer.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      offsetLeft: rect.left,
      offsetTop: rect.top,
    };
  }

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return {
      width: visualViewport.width,
      height: visualViewport.height,
      offsetLeft: visualViewport.offsetLeft,
      offsetTop: visualViewport.offsetTop,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
  };
};
