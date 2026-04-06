import { type Fiber, type HookType, type MemoizedState } from "bippy";
import type { InspectPropertyRow } from "../types.js";
import { formatPropValue } from "./format-prop-value.js";
import { findNearestCompositeFiber } from "./find-nearest-composite-fiber.js";
import { INSPECT_MAX_HOOKS } from "../constants.js";

const STATEFUL_HOOK_TYPES = new Set<HookType>(["useState", "useReducer"]);

interface FiberWithDebugHooks extends Fiber {
  _debugHookTypes?: HookType[];
}

export const getHooksState = (element: Element): InspectPropertyRow[] => {
  const compositeFiber = findNearestCompositeFiber(element) as FiberWithDebugHooks | null;
  if (!compositeFiber) return [];

  const hookTypes = compositeFiber._debugHookTypes;
  if (!hookTypes) return [];

  const rows: InspectPropertyRow[] = [];
  let hookState: MemoizedState | null = compositeFiber.memoizedState;
  let hookIndex = 0;

  while (hookState && hookIndex < hookTypes.length) {
    const hookType = hookTypes[hookIndex];
    if (STATEFUL_HOOK_TYPES.has(hookType)) {
      rows.push({ label: hookType, value: formatPropValue(hookState.memoizedState) });
      if (rows.length >= INSPECT_MAX_HOOKS) break;
    }
    hookState = hookState.next;
    hookIndex++;
  }

  return rows;
};
