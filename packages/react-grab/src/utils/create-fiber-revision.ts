export interface FiberRevisionSource {
  _debugOwner?: unknown;
  _debugSource?: unknown;
  _debugStack?: unknown;
  actualStartTime?: number;
}

export interface FiberRevision {
  matches: (currentFiber: FiberRevisionSource) => boolean;
}

export const createFiberRevision = (fiber: FiberRevisionSource): FiberRevision => {
  const debugOwner = fiber._debugOwner;
  const debugSource = fiber._debugSource;
  const debugStack = fiber._debugStack;

  return {
    matches: (currentFiber) =>
      currentFiber._debugOwner === debugOwner &&
      currentFiber._debugSource === debugSource &&
      currentFiber._debugStack === debugStack,
  };
};
