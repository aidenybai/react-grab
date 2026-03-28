import type { ElementMeasurement } from "../types.js";
import {
  nativeRequestAnimationFrame,
  nativeCancelAnimationFrame,
} from "./native-raf.js";

interface MeasureElementHandle {
  observe: (element: Element) => void;
  unobserve: (element: Element) => void;
  disconnect: () => void;
}

export const createElementMeasurer = (
  onMeasure: (element: Element, measurement: ElementMeasurement) => void,
): MeasureElementHandle => {
  const trackedElements = new Set<Element>();
  let frameId: number | undefined;
  let isDisconnected = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        observer.unobserve(entry.target);

        if (!trackedElements.has(entry.target)) continue;

        const { boundingClientRect } = entry;
        onMeasure(entry.target, {
          x: boundingClientRect.x,
          y: boundingClientRect.y,
          width: boundingClientRect.width,
          height: boundingClientRect.height,
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
        });
      }

      scheduleNextFrame();
    },
    { threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1] },
  );

  const observeTrackedElements = () => {
    for (const element of trackedElements) {
      observer.observe(element);
    }
  };

  const scheduleNextFrame = () => {
    if (isDisconnected || trackedElements.size === 0) return;

    if (frameId !== undefined) {
      nativeCancelAnimationFrame(frameId);
    }

    frameId = nativeRequestAnimationFrame(() => {
      frameId = undefined;
      observeTrackedElements();
    });
  };

  const observe = (element: Element) => {
    if (isDisconnected) return;
    trackedElements.add(element);
    scheduleNextFrame();
  };

  const unobserve = (element: Element) => {
    trackedElements.delete(element);
    observer.unobserve(element);

    if (trackedElements.size === 0 && frameId !== undefined) {
      nativeCancelAnimationFrame(frameId);
      frameId = undefined;
    }
  };

  const disconnect = () => {
    isDisconnected = true;
    trackedElements.clear();
    observer.disconnect();

    if (frameId !== undefined) {
      nativeCancelAnimationFrame(frameId);
      frameId = undefined;
    }
  };

  return { observe, unobserve, disconnect };
};
