import { traverseProps, type Fiber } from "bippy";
import { MOTION_OBJECT_PROP_KEYS, PROP_NUMERIC_MAX_COUNT } from "../constants.js";

export interface FiberNumericProp {
  path: string[];
  value: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEditableNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

// Walks a single component's props and pulls out the numeric values worth
// tweaking: top-level numbers (e.g. a three.js wrapper's `count`/`speed`)
// and the direct numeric members of motion-style object props (e.g.
// `animate.opacity`, `transition.duration`). Host fibers are never passed
// here, so DOM attributes like width/height never leak in.
export const collectFiberNumericProps = (fiber: Fiber): FiberNumericProp[] => {
  const collected: FiberNumericProp[] = [];

  traverseProps(fiber, (propName, nextValue) => {
    if (collected.length >= PROP_NUMERIC_MAX_COUNT) return true;
    if (isEditableNumber(nextValue)) {
      collected.push({ path: [propName], value: nextValue });
      return false;
    }
    if (MOTION_OBJECT_PROP_KEYS.has(propName) && isPlainObject(nextValue)) {
      for (const innerKey in nextValue) {
        if (collected.length >= PROP_NUMERIC_MAX_COUNT) break;
        const innerValue = nextValue[innerKey];
        if (isEditableNumber(innerValue)) {
          collected.push({ path: [propName, innerKey], value: innerValue });
        }
      }
    }
    return false;
  });

  return collected;
};
