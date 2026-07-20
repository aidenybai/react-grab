export const supportsOffscreenCanvasWorker = (canvas: HTMLCanvasElement): boolean =>
  typeof Worker !== "undefined" &&
  typeof OffscreenCanvas !== "undefined" &&
  typeof canvas.transferControlToOffscreen === "function";
