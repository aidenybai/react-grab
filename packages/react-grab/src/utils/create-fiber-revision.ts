export interface FiberRevisionSource {
  _debugOwner?: unknown;
  _debugSource?: unknown;
  _debugStack?: unknown;
  actualStartTime?: number;
}

export interface FiberRevision {
  matches: (currentFiber: FiberRevisionSource, currentFiberId: number) => boolean;
}

export const createFiberRevision = (fiber: FiberRevisionSource, fiberId: number): FiberRevision => {
  const debugOwner = fiber._debugOwner;
  const debugSource = fiber._debugSource;
  const debugStack = fiber._debugStack;

  return {
    matches: (currentFiber, currentFiberId) =>
      currentFiberId === fiberId &&
      currentFiber._debugOwner === debugOwner &&
      currentFiber._debugSource === debugSource &&
      currentFiber._debugStack === debugStack,
  };
};
