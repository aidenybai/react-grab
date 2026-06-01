import {
  ClassComponentTag,
  type Fiber,
  ForwardRefTag,
  FunctionComponentTag,
  MemoComponentTag,
  SimpleMemoComponentTag,
  traverseContexts,
  traverseProps,
  traverseState,
} from "bippy";
import type { ScanFiberChange } from "../types.js";

const isCompositeTag = (tag: number): boolean =>
  tag === FunctionComponentTag ||
  tag === ClassComponentTag ||
  tag === ForwardRefTag ||
  tag === MemoComponentTag ||
  tag === SimpleMemoComponentTag;

const collectChangedProps = (fiber: Fiber): string[] => {
  const changed: string[] = [];
  traverseProps(fiber, (propName, nextValue, prevValue) => {
    if (!Object.is(prevValue, nextValue)) changed.push(propName);
  });
  return changed;
};

const didAnyContextChange = (fiber: Fiber): boolean => {
  let changed = false;
  traverseContexts(fiber, (nextContext, prevContext) => {
    if (!nextContext || !prevContext) return;
    // A context-identity mismatch means the dependency lists diverged (e.g. a
    // conditional context read); skip this slot rather than aborting, so a
    // genuine value change in a later context is still detected.
    if (nextContext.context !== prevContext.context) return;
    if (!Object.is(prevContext.memoizedValue, nextContext.memoizedValue)) {
      changed = true;
      return true;
    }
  });
  return changed;
};

const didAnyClassStateChange = (fiber: Fiber): boolean => {
  const previousState = fiber.alternate?.memoizedState;
  const nextState = fiber.memoizedState;
  if (
    !previousState ||
    !nextState ||
    typeof previousState !== "object" ||
    typeof nextState !== "object"
  ) {
    return previousState !== nextState;
  }
  const previousObject = previousState as Record<string, unknown>;
  const nextObject = nextState as Record<string, unknown>;
  for (const key of new Set([...Object.keys(previousObject), ...Object.keys(nextObject)])) {
    if (!Object.is(previousObject[key], nextObject[key])) return true;
  }
  return false;
};

// Indices of stateful hooks whose memoizedState changed by reference.
// Approximate: conflates useState with useMemo/useCallback/useEffect deps.
const collectChangedHookIndices = (fiber: Fiber): number[] => {
  const indices: number[] = [];
  let index = 0;
  traverseState(fiber, (nextState, prevState) => {
    if (nextState && prevState && !Object.is(prevState.memoizedState, nextState.memoizedState)) {
      indices.push(index);
    }
    index++;
  });
  return indices;
};

// Why a fiber re-rendered, attributed to props / state / context / hooks, or
// flagged as a first mount / parent cascade. Ported from react-scan/lite (which
// ports react-devtools' getChangeDescription); `parentRendered` is supplied by
// the caller, which already knows whether a composite ancestor rendered.
export const getChangeDescription = (
  fiber: Fiber,
  parentRendered: boolean,
): ScanFiberChange | null => {
  if (!isCompositeTag(fiber.tag)) return null;

  if (fiber.alternate === null) {
    return { isFirstMount: true, props: null, state: false, context: false, hooks: [], parent: false };
  }

  if (fiber.tag === ClassComponentTag) {
    return {
      isFirstMount: false,
      props: collectChangedProps(fiber),
      state: didAnyClassStateChange(fiber),
      context: didAnyContextChange(fiber),
      hooks: [],
      parent: parentRendered,
    };
  }

  return {
    isFirstMount: false,
    props: collectChangedProps(fiber),
    state: false,
    context: didAnyContextChange(fiber),
    hooks: collectChangedHookIndices(fiber),
    parent: parentRendered,
  };
};
