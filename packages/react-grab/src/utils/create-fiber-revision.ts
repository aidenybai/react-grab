export interface FiberRevisionSource {
  _debugSource?: unknown;
  _debugStack?: unknown;
  actualStartTime?: number;
}

export interface FiberRevision {
  matches: (currentFiber: FiberRevisionSource) => boolean;
}

export const createFiberRevision = (fiber: FiberRevisionSource): FiberRevision => {
  const debugSource = fiber._debugSource;
  const debugStack = fiber._debugStack;
  const actualStartTime = fiber.actualStartTime;

  return {
    matches: (currentFiber) =>
      currentFiber === fiber &&
      currentFiber._debugSource === debugSource &&
      currentFiber._debugStack === debugStack &&
      currentFiber.actualStartTime === actualStartTime,
  };
};
