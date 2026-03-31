import type { ElementMeasurement } from "../types.js";
import {
  nativeRequestAnimationFrame,
  nativeCancelAnimationFrame,
} from "./native-raf.js";

interface ElementMeasurerHandle {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
}

export const createElementMeasurer = (
  onMeasurement: (element: Element, measurement: ElementMeasurement) => void,
): ElementMeasurerHandle => {
  const trackedElements = new Set<Element>();
  let pendingFrameId: number | undefined;
  let didDisconnect = false;

  const cancelPendingFrame = () => {
    if (pendingFrameId === undefined) return;
    nativeCancelAnimationFrame(pendingFrameId);
    pendingFrameId = undefined;
  };

  const scheduleNextFrame = () => {
    if (didDisconnect || trackedElements.size === 0) return;
    cancelPendingFrame();

    pendingFrameId = nativeRequestAnimationFrame(() => {
      pendingFrameId = undefined;
      for (const element of trackedElements) {
        intersectionObserver.observe(element);
      }
    });
  };

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      intersectionObserver.unobserve(entry.target);
      if (!trackedElements.has(entry.target)) continue;

      const { boundingClientRect } = entry;
      onMeasurement(entry.target, {
        x: boundingClientRect.x,
        y: boundingClientRect.y,
        width: boundingClientRect.width,
        height: boundingClientRect.height,
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
      });
    }

    scheduleNextFrame();
  });

  const observe = (element: Element) => {
    if (didDisconnect) return;
    trackedElements.add(element);
    scheduleNextFrame();
  };

  const unobserve = (element: Element) => {
    trackedElements.delete(element);
    intersectionObserver.unobserve(element);
    if (trackedElements.size === 0) cancelPendingFrame();
  };

  const disconnect = () => {
    didDisconnect = true;
    trackedElements.clear();
    intersectionObserver.disconnect();
    cancelPendingFrame();
  };

  return { observe, unobserve, disconnect };
};
