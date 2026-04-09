import { nativeRequestAnimationFrame } from "./native-raf.js";

// Defers hit-testing work to the next animation frame so it doesn't block the
// current event handler. requestAnimationFrame fires once per frame (~16ms) at
// rendering priority, which avoids the multi-second starvation seen with
// scheduler.postTask({priority:"background"}) and requestIdleCallback on pages
// with continuous React renders or CSS animations.
export const onIdle = (callback: () => void): void => {
  nativeRequestAnimationFrame(callback);
};
