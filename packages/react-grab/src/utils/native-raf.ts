const isClientSide = typeof window !== "undefined";

const noopAnimationFrame = (_callback: FrameRequestCallback): number => 0;
const noopCancelFrame = (_id: number): void => {};

export const nativeRequestAnimationFrame: typeof requestAnimationFrame =
  isClientSide ? window.requestAnimationFrame.bind(window) : noopAnimationFrame;

export const nativeCancelAnimationFrame: typeof cancelAnimationFrame =
  isClientSide ? window.cancelAnimationFrame.bind(window) : noopCancelFrame;

export const waitUntilNextFrame = (): Promise<void> =>
  isClientSide
    ? new Promise<void>((resolve) =>
        nativeRequestAnimationFrame(() => resolve()),
      )
    : Promise.resolve();
