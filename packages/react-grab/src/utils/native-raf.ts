const noopAnimationFrame = (_callback: FrameRequestCallback): number => 0;
const noopCancelFrame = (_id: number): void => {};

export const nativeRequestAnimationFrame =
  typeof window !== "undefined"
    ? window.requestAnimationFrame.bind(window)
    : noopAnimationFrame;

export const nativeCancelAnimationFrame =
  typeof window !== "undefined"
    ? window.cancelAnimationFrame.bind(window)
    : noopCancelFrame;

export const waitUntilNextFrame = (): Promise<void> =>
  new Promise<void>((resolve) => nativeRequestAnimationFrame(() => resolve()));
