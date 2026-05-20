import { EVENT_LOG_RING_BUFFER_SIZE, EVENT_LOG_SCHEMA_VERSION } from "../constants.js";
import { createElementSelector } from "../utils/create-element-selector.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import type {
  ReactGrabLoggedEvent,
  ReactGrabRegisteredElement,
  ReactGrabReplayOptions,
  ReactGrabSession,
  ReactGrabSessionViewport,
} from "../types.js";

interface SerializedElementHandle {
  __rgHandle: string;
}

type RegisteredElement = ReactGrabRegisteredElement;
type LoggedEvent = ReactGrabLoggedEvent;
type Session = ReactGrabSession;
type ReplayOptions = ReactGrabReplayOptions;
type SessionViewport = ReactGrabSessionViewport;

interface ElementHandleRegistry {
  toHandle: (element: Element) => string;
  resolve: (handle: string) => Element | null;
  registered: () => RegisteredElement[];
  reset: () => void;
  hydrate: (entries: RegisteredElement[]) => void;
}

interface EventLog {
  dispatch: <Args extends unknown[]>(name: string, args: Args, timestamp?: number) => void;
  getEvents: () => LoggedEvent[];
  getSession: () => Session;
  clear: () => void;
  isRecording: () => boolean;
  setRecording: (value: boolean) => void;
  subscribe: (listener: (event: LoggedEvent) => void) => () => void;
  resolveHandle: (handle: string) => Element | null;
  hydrateRegistry: (entries: RegisteredElement[]) => void;
}

const HANDLE_PREFIX = "rg-el";

const COLLAPSIBLE_ACTIONS: ReadonlySet<string> = new Set([
  "setPointer",
  "setDetectedElement",
  "setInputText",
  "setFrozenDragRect",
  "updateContextMenuPosition",
  "incrementViewportVersion",
]);

const argsEqual = (firstArgs: readonly unknown[], secondArgs: readonly unknown[]): boolean => {
  if (firstArgs === secondArgs) return true;
  if (firstArgs.length !== secondArgs.length) return false;
  for (let index = 0; index < firstArgs.length; index += 1) {
    if (!shallowDeepEqual(firstArgs[index], secondArgs[index])) return false;
  }
  return true;
};

const shallowDeepEqual = (firstValue: unknown, secondValue: unknown): boolean => {
  if (firstValue === secondValue) return true;
  if (firstValue === null || secondValue === null) return false;
  if (typeof firstValue !== typeof secondValue) return false;
  if (typeof firstValue !== "object") return false;
  if (Array.isArray(firstValue) !== Array.isArray(secondValue)) return false;
  if (Array.isArray(firstValue) && Array.isArray(secondValue)) {
    if (firstValue.length !== secondValue.length) return false;
    for (let index = 0; index < firstValue.length; index += 1) {
      if (!shallowDeepEqual(firstValue[index], secondValue[index])) return false;
    }
    return true;
  }
  const firstObject = firstValue as Record<string, unknown>;
  const secondObject = secondValue as Record<string, unknown>;
  const firstKeys = Object.keys(firstObject);
  if (firstKeys.length !== Object.keys(secondObject).length) return false;
  for (const key of firstKeys) {
    if (!shallowDeepEqual(firstObject[key], secondObject[key])) return false;
  }
  return true;
};

const createElementHandleRegistry = (): ElementHandleRegistry => {
  const elementToHandle = new WeakMap<Element, string>();
  const handleToWeakRef = new Map<string, WeakRef<Element>>();
  const handleToMetadata = new Map<string, RegisteredElement>();
  let nextHandleId = 0;

  const mintHandle = (): string => {
    nextHandleId += 1;
    return `${HANDLE_PREFIX}-${nextHandleId}`;
  };

  const captureMetadata = (handle: string, element: Element): RegisteredElement => {
    let selector = "";
    try {
      selector = createElementSelector(element);
    } catch {
      selector = "";
    }
    const entry: RegisteredElement = {
      handle,
      selector,
      tagName: element.tagName?.toLowerCase?.() ?? "unknown",
    };
    handleToMetadata.set(handle, entry);
    return entry;
  };

  const toHandle: ElementHandleRegistry["toHandle"] = (element) => {
    const existing = elementToHandle.get(element);
    if (existing) return existing;
    const handle = mintHandle();
    elementToHandle.set(element, handle);
    handleToWeakRef.set(handle, new WeakRef(element));
    captureMetadata(handle, element);
    return handle;
  };

  const resolve: ElementHandleRegistry["resolve"] = (handle) => {
    const weakRef = handleToWeakRef.get(handle);
    const cached = weakRef?.deref();
    if (cached && isElementConnected(cached)) return cached;

    const metadata = handleToMetadata.get(handle);
    if (!metadata || !metadata.selector) return null;
    try {
      const found = document.querySelector(metadata.selector);
      if (found instanceof Element) {
        elementToHandle.set(found, handle);
        handleToWeakRef.set(handle, new WeakRef(found));
        return found;
      }
    } catch {}
    return null;
  };

  const registered: ElementHandleRegistry["registered"] = () =>
    Array.from(handleToMetadata.values());

  const reset: ElementHandleRegistry["reset"] = () => {
    handleToWeakRef.clear();
    handleToMetadata.clear();
    nextHandleId = 0;
  };

  const hydrate: ElementHandleRegistry["hydrate"] = (entries) => {
    for (const entry of entries) {
      handleToMetadata.set(entry.handle, entry);
      const numericPart = Number(entry.handle.slice(HANDLE_PREFIX.length + 1));
      if (Number.isFinite(numericPart) && numericPart > nextHandleId) {
        nextHandleId = numericPart;
      }
    }
  };

  return { toHandle, resolve, registered, reset, hydrate };
};

const isSerializedHandle = (value: unknown): value is SerializedElementHandle =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as SerializedElementHandle).__rgHandle === "string";

const serializeValue = (value: unknown, registry: ElementHandleRegistry): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof Element !== "undefined" && value instanceof Element) {
    return { __rgHandle: registry.toHandle(value) };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry, registry));
  }
  if (typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const serialized = serializeValue((value as Record<string, unknown>)[key], registry);
      if (serialized !== undefined) clone[key] = serialized;
    }
    return clone;
  }
  return undefined;
};

type HandleResolver = (handle: string) => Element | null;

const deserializeValue = (value: unknown, resolveHandle: HandleResolver): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (isSerializedHandle(value)) {
    return resolveHandle(value.__rgHandle);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deserializeValue(entry, resolveHandle));
  }
  if (typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      clone[key] = deserializeValue((value as Record<string, unknown>)[key], resolveHandle);
    }
    return clone;
  }
  return value;
};

const captureViewport = (): SessionViewport => {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, scrollX: 0, scrollY: 0, devicePixelRatio: 1 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
};

const createEventLog = (): EventLog => {
  const registry = createElementHandleRegistry();
  const ringBuffer: LoggedEvent[] = [];
  const listeners = new Set<(event: LoggedEvent) => void>();
  let isRecordingFlag = true;
  let firstEventTimestamp: number | null = null;
  let lastEventTimestamp: number | null = null;
  const createdAt = Date.now();

  const dispatch: EventLog["dispatch"] = (name, args, timestamp) => {
    if (!isRecordingFlag) return;
    const t = timestamp ?? Date.now();
    const serializedArgs = Array.from(args).map((arg) => serializeValue(arg, registry));

    const lastEntry = ringBuffer[ringBuffer.length - 1];
    if (lastEntry && lastEntry.name === name) {
      const canCollapseAdjacent = COLLAPSIBLE_ACTIONS.has(name);
      const isExactRepeat = argsEqual(lastEntry.args, serializedArgs);
      if (canCollapseAdjacent || isExactRepeat) {
        lastEntry.t = t;
        lastEntry.args = serializedArgs;
        lastEntry.coalescedCount = (lastEntry.coalescedCount ?? 1) + 1;
        if (firstEventTimestamp === null) firstEventTimestamp = t;
        lastEventTimestamp = t;
        for (const listener of listeners) {
          try {
            listener(lastEntry);
          } catch {}
        }
        return;
      }
    }

    const entry: LoggedEvent = { t, name, args: serializedArgs };
    ringBuffer.push(entry);
    if (ringBuffer.length > EVENT_LOG_RING_BUFFER_SIZE) {
      ringBuffer.shift();
    }
    if (firstEventTimestamp === null) firstEventTimestamp = t;
    lastEventTimestamp = t;
    for (const listener of listeners) {
      try {
        listener(entry);
      } catch {}
    }
  };

  const getEvents: EventLog["getEvents"] = () => ringBuffer.slice();

  const getSession: EventLog["getSession"] = () => {
    const snapshot: Session = {
      version: EVENT_LOG_SCHEMA_VERSION,
      createdAt,
      startedAt: firstEventTimestamp,
      endedAt: lastEventTimestamp,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      href: typeof location !== "undefined" ? location.href : "",
      viewport: captureViewport(),
      elements: registry.registered().map((entry) => ({ ...entry })),
      events: ringBuffer.map((entry) => ({
        t: entry.t,
        name: entry.name,
        args: entry.args.slice(),
        ...(entry.coalescedCount === undefined ? {} : { coalescedCount: entry.coalescedCount }),
      })),
    };
    return JSON.parse(JSON.stringify(snapshot)) as Session;
  };

  const clear: EventLog["clear"] = () => {
    ringBuffer.length = 0;
    firstEventTimestamp = null;
    lastEventTimestamp = null;
    registry.reset();
  };

  const subscribe: EventLog["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    dispatch,
    getEvents,
    getSession,
    clear,
    isRecording: () => isRecordingFlag,
    setRecording: (value) => {
      isRecordingFlag = value;
    },
    subscribe,
    resolveHandle: registry.resolve,
    hydrateRegistry: registry.hydrate,
  };
};

const RESET_BEFORE_REPLAY_ACTION_NAMES = [
  "deactivate",
  "clearGrabbedBoxes",
  "clearLabelInstances",
  "hideContextMenu",
  "clearInputText",
] as const;

const replaySessionInto = async (
  session: Session,
  log: EventLog,
  actions: object,
  options: ReplayOptions = {},
): Promise<void> => {
  log.setRecording(false);
  try {
    const actionsByName = actions as Record<string, (...args: unknown[]) => unknown>;
    for (const resetActionName of RESET_BEFORE_REPLAY_ACTION_NAMES) {
      const resetAction = actionsByName[resetActionName];
      if (typeof resetAction === "function") {
        try {
          resetAction();
        } catch {}
      }
    }

    log.clear();
    log.hydrateRegistry(session.elements);

    const startedAt = session.startedAt ?? 0;
    const replayStartedAt = Date.now();

    for (let index = 0; index < session.events.length; index += 1) {
      const event = session.events[index];
      const action = actionsByName[event.name];
      if (typeof action !== "function") continue;

      if (options.realtime && startedAt > 0) {
        const elapsedInSession = event.t - startedAt;
        const elapsedSinceReplay = Date.now() - replayStartedAt;
        const waitMs = elapsedInSession - elapsedSinceReplay;
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }

      const args = event.args.map((arg) => deserializeValue(arg, log.resolveHandle));
      try {
        action(...args);
      } catch {}
      options.onEvent?.(event, index);
    }
  } finally {
    log.setRecording(true);
  }
};

export { createEventLog, replaySessionInto };
export type { EventLog };
