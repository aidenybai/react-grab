import type { Fiber } from "bippy";

export const readPropAtPath = (fiber: Fiber, path: readonly string[]): unknown => {
  let current: unknown = fiber.memoizedProps;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

// Builds the nested partial bippy's overrideProps expects, e.g.
// ["transition", "duration"] + 0.8 -> { transition: { duration: 0.8 } }.
export const buildNestedPropPartial = (
  path: readonly string[],
  value: unknown,
): Record<string, unknown> => {
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
