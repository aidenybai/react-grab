import { getLatestFiber, getNearestHostFiber, instrument, overrideProps, type Fiber } from "bippy";
import { buildNestedPropPartial, readPropAtPath } from "./prop-path.js";

interface StickyOverride {
  fiber: Fiber;
  pathKey: string;
  path: readonly string[];
  value: number;
}

// bippy's overrideProps is a one-shot override: the next time the owning
// parent re-renders, React passes the real props again and the tweak is
// gone (the same way React DevTools prop edits don't survive a re-render).
// To make a prop edit persist like a CSS inline style, every sticky
// override is re-asserted after each commit. The value check makes the
// re-assert a no-op once it has taken, so it can't loop.
const stickyOverrides: StickyOverride[] = [];
let isCommitListenerInstalled = false;
let isReapplyScheduled = false;

// A fiber and its alternate are the same component across commits. Matching
// by reference (either alternate) avoids bippy's getFiberId, which is
// unreliable for the id 0.
const isSameComponent = (candidate: Fiber, target: Fiber): boolean =>
  candidate === target || candidate === target.alternate;

const findOverrideIndex = (fiber: Fiber, pathKey: string): number =>
  stickyOverrides.findIndex(
    (override) => override.pathKey === pathKey && isSameComponent(override.fiber, fiber),
  );

const isFiberConnected = (fiber: Fiber): boolean => {
  const hostFiber = getNearestHostFiber(fiber);
  const node = hostFiber?.stateNode;
  return node instanceof Node ? node.isConnected : true;
};

const reapply = (): void => {
  isReapplyScheduled = false;
  for (let overrideIndex = stickyOverrides.length - 1; overrideIndex >= 0; overrideIndex--) {
    const override = stickyOverrides[overrideIndex];
    const fiber = getLatestFiber(override.fiber);
    if (!fiber || !isFiberConnected(fiber)) {
      stickyOverrides.splice(overrideIndex, 1);
      continue;
    }
    override.fiber = fiber;
    if (Object.is(readPropAtPath(fiber, override.path), override.value)) continue;
    try {
      overrideProps(fiber, buildNestedPropPartial(override.path, override.value));
    } catch {
      // overrideProps reaches into renderer internals; ignore failures.
    }
  }
};

const scheduleReapply = (): void => {
  if (isReapplyScheduled) return;
  isReapplyScheduled = true;
  queueMicrotask(reapply);
};

const ensureCommitListener = (): void => {
  if (isCommitListenerInstalled) return;
  isCommitListenerInstalled = true;
  try {
    instrument({ onCommitFiberRoot: scheduleReapply });
  } catch {
    isCommitListenerInstalled = false;
  }
};

export const setStickyPropOverride = (
  fiber: Fiber,
  path: readonly string[],
  value: number,
): void => {
  const pathKey = JSON.stringify(path);
  const existingIndex = findOverrideIndex(fiber, pathKey);
  if (existingIndex !== -1) {
    stickyOverrides[existingIndex].value = value;
    stickyOverrides[existingIndex].fiber = fiber;
  } else {
    stickyOverrides.push({ fiber, pathKey, path, value });
  }
  ensureCommitListener();
};

export const clearStickyPropOverride = (fiber: Fiber, path: readonly string[]): void => {
  const index = findOverrideIndex(fiber, JSON.stringify(path));
  if (index !== -1) stickyOverrides.splice(index, 1);
};
