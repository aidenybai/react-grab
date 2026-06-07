import { traverseProps, type Fiber } from "bippy";
import {
  EDITABLE_OBJECT_PROP_KEYS,
  PROP_NESTED_MAX_DEPTH,
  PROP_NUMERIC_MAX_COUNT,
} from "../constants.js";

export interface FiberNumericProp {
  path: string[];
  value: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEditableNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

// Recurses an object-valued prop, collecting numeric leaves at any depth up
// to PROP_NESTED_MAX_DEPTH. This reaches both motion's inline targets
// (animate.opacity) and the level-deeper `variants` map
// (variants.whileHover.transition.duration), which is how motion is most
// commonly written.
const collectNumericLeaves = (
  object: Record<string, unknown>,
  pathPrefix: string[],
  depth: number,
  collected: FiberNumericProp[],
): void => {
  for (const key in object) {
    if (collected.length >= PROP_NUMERIC_MAX_COUNT) return;
    const childValue = object[key];
    const childPath = [...pathPrefix, key];
    if (isEditableNumber(childValue)) {
      collected.push({ path: childPath, value: childValue });
    } else if (depth < PROP_NESTED_MAX_DEPTH && isPlainObject(childValue)) {
      collectNumericLeaves(childValue, childPath, depth + 1, collected);
    }
  }
};

// Walks a single component's props and pulls out the numeric values worth
// tweaking: top-level numbers (e.g. a three.js wrapper's `count`/`speed`)
// and the nested numeric members of motion-style object props. Host fibers
// are never passed here, so DOM attributes like width/height never leak in.
export const collectFiberNumericProps = (fiber: Fiber): FiberNumericProp[] => {
  const collected: FiberNumericProp[] = [];

  traverseProps(fiber, (propName, nextValue) => {
    if (collected.length >= PROP_NUMERIC_MAX_COUNT) return true;
    if (isEditableNumber(nextValue)) {
      collected.push({ path: [propName], value: nextValue });
    } else if (EDITABLE_OBJECT_PROP_KEYS.has(propName) && isPlainObject(nextValue)) {
      collectNumericLeaves(nextValue, [propName], 1, collected);
    }
    return false;
  });

  return collected;
};
