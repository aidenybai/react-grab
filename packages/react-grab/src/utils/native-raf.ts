const isClientSide = typeof window !== "undefined";

const noopAnimationFrame = (_callback: FrameRequestCallback): number => 0;
const noopCancelFrame = (_id: number): void => {};

// We read requestAnimationFrame from Window.prototype rather than the window
// instance to bypass the GSAP freeze wrapper installed by freeze-gsap.ts.
// That wrapper does `window.requestAnimationFrame = ...` which creates an own
// property shadowing the prototype, but the native implementation remains on
// Window.prototype. Without this, react-grab's own overlay canvas animation
// loop would be frozen by its own GSAP interception.
export const nativeRequestAnimationFrame: typeof requestAnimationFrame = isClientSide
  ? (
      Object.getOwnPropertyDescriptor(Window.prototype, "requestAnimationFrame")?.value ??
      window.requestAnimationFrame
    ).bind(window)
  : noopAnimationFrame;

export const nativeCancelAnimationFrame: typeof cancelAnimationFrame = isClientSide
  ? (
      Object.getOwnPropertyDescriptor(Window.prototype, "cancelAnimationFrame")?.value ??
      window.cancelAnimationFrame
    ).bind(window)
  : noopCancelFrame;

export const waitUntilNextFrame = (): Promise<void> =>
  isClientSide
    ? new Promise<void>((resolve) => nativeRequestAnimationFrame(() => resolve()))
    : Promise.resolve();
