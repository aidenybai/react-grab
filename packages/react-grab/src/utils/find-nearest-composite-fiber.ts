import { getFiberFromHostInstance, isCompositeFiber, type Fiber } from "bippy";

export const findNearestCompositeFiber = (element: Element): Fiber | null => {
  const hostFiber = getFiberFromHostInstance(element);
  if (!hostFiber) return null;

  let currentFiber: Fiber | null = hostFiber.return;
  while (currentFiber) {
    if (isCompositeFiber(currentFiber)) return currentFiber;
    currentFiber = currentFiber.return;
  }
  return null;
};
