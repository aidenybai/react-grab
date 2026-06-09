import {
  getFiberFromHostInstance,
  isCompositeFiber,
  isInstrumentationActive,
  type Fiber,
} from "bippy";
import { PROP_FIBER_MAX_COMPOSITE_WALK } from "../constants.js";
import { collectFiberNumericProps } from "./collect-fiber-numeric-props.js";

const findNearestFiber = (element: Element): Fiber | null => {
  let current: Element | null = element;
  while (current) {
    const fiber = getFiberFromHostInstance(current);
    if (fiber) return fiber;
    current = current.parentElement;
  }
  return null;
};

// Resolves the nearest ancestor component fiber that exposes editable
// numeric props. The selected element is usually a host node (the div a
// motion component renders, or the canvas a three.js scene draws into);
// the props worth editing live on a composite fiber above it. The walk is
// bounded so an unrelated far-up ancestor with a stray numeric prop is
// never surfaced.
export const findPropsFiber = (element: Element): Fiber | null => {
  if (!isInstrumentationActive()) return null;
  let fiber = findNearestFiber(element);
  let compositesSeen = 0;
  while (fiber) {
    if (isCompositeFiber(fiber)) {
      if (collectFiberNumericProps(fiber).length > 0) return fiber;
      compositesSeen += 1;
      if (compositesSeen >= PROP_FIBER_MAX_COMPOSITE_WALK) return null;
    }
    fiber = fiber.return;
  }
  return null;
};
