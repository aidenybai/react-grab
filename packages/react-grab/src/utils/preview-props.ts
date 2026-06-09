import { overrideProps } from "bippy";
import type { PropPreview } from "../types.js";
import { findPropsFiber } from "./find-props-fiber.js";
import { buildNestedPropPartial, readPropAtPath } from "./prop-path.js";
import { clearStickyPropOverride, setStickyPropOverride } from "./prop-override-registry.js";

// Live preview for prop edits. bippy's overrideProps re-renders the
// component with the overridden value merged in at the given path, so the
// page updates immediately (a motion target re-animates, a three.js count
// re-spawns). Each override is also registered as sticky so it survives
// parent re-renders the way a CSS inline-style edit does; discard clears
// the sticky entry and restores the captured original.
export const createPropPreview = (element: Element): PropPreview => {
  const fiber = findPropsFiber(element);
  const originalByKey = new Map<string, { path: readonly string[]; value: unknown }>();

  const apply = (propPath: readonly string[], value: number): void => {
    if (!fiber || propPath.length === 0) return;
    const key = JSON.stringify(propPath);
    if (!originalByKey.has(key)) {
      originalByKey.set(key, { path: propPath, value: readPropAtPath(fiber, propPath) });
    }
    setStickyPropOverride(fiber, propPath, value);
    try {
      overrideProps(fiber, buildNestedPropPartial(propPath, value));
    } catch {
      // overrideProps reaches into renderer internals; a failure must not
      // tear down the panel.
    }
  };

  const restore = (): void => {
    if (fiber) {
      for (const { path, value } of originalByKey.values()) {
        clearStickyPropOverride(fiber, path);
        try {
          overrideProps(fiber, buildNestedPropPartial(path, value));
        } catch {
          // Best-effort rollback; ignore renderer hiccups.
        }
      }
    }
    originalByKey.clear();
  };

  // Submit keeps the override applied (like a committed inline style), so
  // forget only drops the local bookkeeping and leaves the sticky entry in
  // place to persist across future re-renders.
  const forget = (): void => {
    originalByKey.clear();
  };

  const hasAppliedProps = (): boolean => originalByKey.size > 0;

  return { apply, restore, forget, hasAppliedProps };
};
