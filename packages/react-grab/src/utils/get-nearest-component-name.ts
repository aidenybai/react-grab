import {
  getFiberFromHostInstance,
  getDisplayName,
  isCompositeFiber,
  traverseFiber,
} from "bippy";
import { isCapitalized } from "./is-capitalized.js";

const isInternalComponent = (name: string): boolean =>
  !isCapitalized(name) ||
  name.startsWith("_") ||
  name.startsWith("Primitive.") ||
  (name.includes("Provider") && name.includes("Context"));

export const getNearestComponentName = (
  element: Element,
): string | null => {
  const fiber = getFiberFromHostInstance(element);
  if (!fiber) return null;

  let componentName: string | null = null;
  traverseFiber(
    fiber,
    (currentFiber) => {
      if (isCompositeFiber(currentFiber)) {
        const displayName = getDisplayName(currentFiber);
        if (displayName && !isInternalComponent(displayName)) {
          componentName = displayName;
          return true;
        }
      }
      return false;
    },
    true,
  );

  return componentName;
};
