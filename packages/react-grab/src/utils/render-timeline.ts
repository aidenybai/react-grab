import { createSignal } from "solid-js";
import {
  instrument,
  traverseRenderedFibers,
  getTimings,
  isCompositeFiber,
  getDisplayName,
  type Fiber,
  type FiberRoot,
} from "bippy";
import type { InspectTimelineData } from "../types.js";
import { findNearestCompositeFiber } from "./find-nearest-composite-fiber.js";
import { MAX_TIMELINE_COMMITS } from "../constants.js";

interface TimelineEntry {
  timestamp: number;
  componentDurations: Map<unknown, number>;
}

const commitBuffer: TimelineEntry[] = [];
const [commitVersion, setCommitVersion] = createSignal(0);
let isInitialized = false;

export const initRenderTimeline = () => {
  if (isInitialized) return;
  isInitialized = true;

  instrument({
    onCommitFiberRoot(_rendererID: number, root: FiberRoot) {
      const componentDurations = new Map<unknown, number>();

      traverseRenderedFibers(root, (fiber: Fiber) => {
        if (isCompositeFiber(fiber) && getDisplayName(fiber.type)) {
          const { selfTime } = getTimings(fiber);
          const existing = componentDurations.get(fiber.type) ?? 0;
          componentDurations.set(fiber.type, existing + selfTime);
        }
      });

      if (componentDurations.size === 0) return;

      commitBuffer.push({ timestamp: performance.now(), componentDurations });

      if (commitBuffer.length > MAX_TIMELINE_COMMITS) {
        commitBuffer.splice(0, commitBuffer.length - MAX_TIMELINE_COMMITS);
      }

      setCommitVersion((previousVersion) => previousVersion + 1);
    },
  });
};

export const getTimelineForElement = (element: Element): InspectTimelineData | undefined => {
  void commitVersion();

  const compositeFiber = findNearestCompositeFiber(element);
  if (!compositeFiber) return undefined;

  const componentType = compositeFiber.type;
  const commits = commitBuffer
    .filter((entry) => entry.componentDurations.has(componentType))
    .map((entry) => ({
      timestamp: entry.timestamp,
      duration: entry.componentDurations.get(componentType) ?? 0,
    }));

  if (commits.length === 0) return undefined;
  return { commits, totalRenderCount: commits.length };
};
