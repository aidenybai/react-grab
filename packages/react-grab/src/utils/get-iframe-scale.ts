export const getIframeScale = (renderedSize: number, layoutSize: number): number =>
  layoutSize > 0 ? renderedSize / layoutSize : 1;
