import { overrideProps, type Fiber } from "bippy";
import type { PropPreview } from "../types.js";
import { findPropsFiber } from "./find-props-fiber.js";

const readPropAtPath = (fiber: Fiber, path: readonly string[]): unknown => {
  let current: unknown = fiber.memoizedProps;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const buildNestedPartial = (path: readonly string[], value: unknown): Record<string, unknown> => {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let segmentIndex = 0; segmentIndex < path.length - 1; segmentIndex++) {
    const next: Record<string, unknown> = {};
    cursor[path[segmentIndex]] = next;
    cursor = next;
  }
  cursor[path[path.length - 1]] = value;
  return root;
};

// Live preview for prop edits. bippy's overrideProps re-renders the
// component with the overridden value merged in at the given path, so the
// page updates immediately (a motion target re-animates, a three.js count
// re-spawns). The original leaf at each touched path is captured on first
// apply so discard can roll every change back.
export const createPropPreview = (element: Element): PropPreview => {
  const fiber = findPropsFiber(element);
  const originalByKey = new Map<string, { path: readonly string[]; value: unknown }>();

  const apply = (propPath: readonly string[], value: number): void => {
    if (!fiber || propPath.length === 0) return;
    // NUL separator so segments can never alias (["a.b"] vs ["a","b"]).
    const key = propPath.join("\u0000");
    if (!originalByKey.has(key)) {
      originalByKey.set(key, { path: propPath, value: readPropAtPath(fiber, propPath) });
    }
    try {
      overrideProps(fiber, buildNestedPartial(propPath, value));
    } catch {
      // overrideProps reaches into renderer internals; a failure must not
      // tear down the panel.
    }
  };

  const restore = (): void => {
    if (fiber) {
      for (const { path, value } of originalByKey.values()) {
        try {
          overrideProps(fiber, buildNestedPartial(path, value));
        } catch {
          // Best-effort rollback; ignore renderer hiccups.
        }
      }
    }
    originalByKey.clear();
  };

  const forget = (): void => {
    originalByKey.clear();
  };

  const hasAppliedProps = (): boolean => originalByKey.size > 0;

  return { apply, restore, forget, hasAppliedProps };
};
