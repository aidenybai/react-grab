import { createSignal } from "solid-js";
import {
  instrument,
  traverseRenderedFibers,
  getTimings,
  isCompositeFiber,
  getDisplayName,
  getFiberId,
  type Fiber,
  type FiberRoot,
} from "bippy";
import type { InspectTimelineData } from "../types.js";
import { findNearestCompositeFiber } from "./find-nearest-composite-fiber.js";
import { MAX_TIMELINE_COMMITS } from "../constants.js";

interface TimelineEntry {
  timestamp: number;
  fiberDurations: Map<number, number>;
}

const commitBuffer: TimelineEntry[] = [];
const [commitVersion, setCommitVersion] = createSignal(0);
let isInitialized = false;

export const initRenderTimeline = () => {
  if (isInitialized) return;
  isInitialized = true;

  instrument({
    onCommitFiberRoot: (_rendererID: number, root: FiberRoot) => {
      const fiberDurations = new Map<number, number>();

      traverseRenderedFibers(root, (fiber: Fiber) => {
        if (isCompositeFiber(fiber) && getDisplayName(fiber.type)) {
          const fiberId = getFiberId(fiber);
          const { selfTime } = getTimings(fiber);
          const existing = fiberDurations.get(fiberId) ?? 0;
          fiberDurations.set(fiberId, existing + selfTime);
        }
      });

      if (fiberDurations.size === 0) return;

      commitBuffer.push({ timestamp: performance.now(), fiberDurations });

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

  const inspectedFiberId = getFiberId(compositeFiber);
  const commits = commitBuffer
    .filter((entry) => entry.fiberDurations.has(inspectedFiberId))
    .map((entry) => ({
      timestamp: entry.timestamp,
      duration: entry.fiberDurations.get(inspectedFiberId) ?? 0,
    }));

  if (commits.length === 0) return undefined;
  return { commits };
};
