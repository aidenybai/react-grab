import {
  getDisplayName,
  getFiberFromHostInstance,
  isCompositeFiber,
  isInstrumentationActive,
} from "bippy";
import { isUsefulComponentName } from "./is-useful-component-name.js";

export interface FiberComponentInfo {
  name: string;
  props: Record<string, unknown> | null;
}

const isPropsRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const getFiberComponentInfo = (element: Element): FiberComponentInfo | null => {
  if (!isInstrumentationActive()) return null;
  const hostFiber = getFiberFromHostInstance(element);
  if (!hostFiber) return null;

  let currentFiber = hostFiber.return;
  while (currentFiber) {
    if (isCompositeFiber(currentFiber)) {
      const name = getDisplayName(currentFiber.type);
      if (name && isUsefulComponentName(name)) {
        const memoizedProps: unknown = currentFiber.memoizedProps;
        const props = isPropsRecord(memoizedProps) ? memoizedProps : null;
        return { name, props };
      }
    }
    currentFiber = currentFiber.return;
  }

  return null;
};
