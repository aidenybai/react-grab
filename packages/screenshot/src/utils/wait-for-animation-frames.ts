import { ANIMATION_FRAME_FALLBACK_MS } from "../constants";

export const waitForAnimationFrames = async (frameCount: number): Promise<void> => {
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    await new Promise<void>((resolve) => {
      // requestAnimationFrame never fires while the document is hidden (background
      // tab, minimized window), so a timeout fallback keeps the wait bounded.
      let fallbackTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const animationFrameId = requestAnimationFrame(() => {
        clearTimeout(fallbackTimeoutId);
        resolve();
      });
      fallbackTimeoutId = setTimeout(() => {
        cancelAnimationFrame(animationFrameId);
        resolve();
      }, ANIMATION_FRAME_FALLBACK_MS);
    });
  }
};
