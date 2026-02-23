const isClientSide = typeof window !== "undefined";

const noopAnimationFrame = (_callback: FrameRequestCallback): number => 0;
const noopCancelFrame = (_id: number): void => {};

// HACK: Read from Window.prototype to bypass any monkey-patching on the window
// instance (e.g., the rAF wrapper installed by freeze-animations.ts). Assigning
// to window.requestAnimationFrame creates an own property that shadows the
// prototype, but the native implementation remains on Window.prototype.
export const nativeRequestAnimationFrame: typeof requestAnimationFrame =
  isClientSide
    ? (
        Object.getOwnPropertyDescriptor(
          Window.prototype,
          "requestAnimationFrame",
        )?.value ?? window.requestAnimationFrame
      ).bind(window)
    : noopAnimationFrame;

export const nativeCancelAnimationFrame: typeof cancelAnimationFrame =
  isClientSide
    ? (
        Object.getOwnPropertyDescriptor(
          Window.prototype,
          "cancelAnimationFrame",
        )?.value ?? window.cancelAnimationFrame
      ).bind(window)
    : noopCancelFrame;

export const waitUntilNextFrame = (): Promise<void> =>
  isClientSide
    ? new Promise<void>((resolve) =>
        nativeRequestAnimationFrame(() => resolve()),
      )
    : Promise.resolve();
