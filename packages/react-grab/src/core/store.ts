import { createStore, produce } from "solid-js/store";
import type {
  Theme,
  GrabbedBox,
  SelectionLabelInstance,
  AgentSession,
  AgentOptions,
} from "../types.js";
import { OFFSCREEN_POSITION } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";

interface Position {
  x: number;
  y: number;
}

interface PendingClickData {
  clientX: number;
  clientY: number;
  element: Element;
}

interface FrozenDragRect {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

type GrabPhase = "hovering" | "frozen" | "dragging" | "justDragged";

type GrabState =
  | { state: "idle" }
  | { state: "holding"; startedAt: number }
  | {
      state: "active";
      phase: GrabPhase;
      isPromptMode: boolean;
      isPendingDismiss: boolean;
    }
  | { state: "copying"; startedAt: number; wasActive: boolean }
  | { state: "justCopied"; copiedAt: number; wasActive: boolean };

interface GrabStore {
  current: GrabState;

  wasActivatedByToggle: boolean;
  hasAgentProvider: boolean;
  keyHoldDuration: number;

  pointer: Position;
  dragStart: Position;
  copyStart: Position;
  copyOffsetFromCenterX: number;

  detectedElement: Element | null;
  frozenElement: Element | null;
  frozenElements: Element[];
  frozenDragRect: FrozenDragRect | null;
  lastGrabbedElement: Element | null;
  lastCopiedElement: Element | null;

  selectionFilePath: string | null;
  selectionLineNumber: number | null;

  inputText: string;
  pendingClickData: PendingClickData | null;
  replySessionId: string | null;

  viewportVersion: number;
  grabbedBoxes: GrabbedBox[];
  labelInstances: SelectionLabelInstance[];

  agentSessions: Map<string, AgentSession>;
  sessionElements: Map<string, Element>;

  isTouchMode: boolean;

  theme: Required<Theme>;

  activationTimestamp: number | null;
  previouslyFocusedElement: Element | null;

  canUndo: boolean;
  canRedo: boolean;
  isAgentConnected: boolean;
  supportsUndo: boolean;
  supportsFollowUp: boolean;
  dismissButtonText: string | undefined;
  pendingAbortSessionId: string | null;

  contextMenuPosition: Position | null;
  contextMenuElement: Element | null;
  contextMenuClickOffset: Position | null;

  selectedAgent: AgentOptions | null;
}

interface GrabStoreInput {
  theme: Required<Theme>;
  hasAgentProvider: boolean;
  keyHoldDuration: number;
}

const createInitialStore = (input: GrabStoreInput): GrabStore => ({
  current: { state: "idle" },

  wasActivatedByToggle: false,
  hasAgentProvider: input.hasAgentProvider,
  keyHoldDuration: input.keyHoldDuration,

  pointer: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  dragStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyOffsetFromCenterX: 0,

  detectedElement: null,
  frozenElement: null,
  frozenElements: [],
  frozenDragRect: null,
  lastGrabbedElement: null,
  lastCopiedElement: null,

  selectionFilePath: null,
  selectionLineNumber: null,

  inputText: "",
  pendingClickData: null,
  replySessionId: null,

  viewportVersion: 0,
  grabbedBoxes: [],
  labelInstances: [],

  agentSessions: new Map(),
  sessionElements: new Map(),

  isTouchMode: false,

  theme: input.theme,

  activationTimestamp: null,
  previouslyFocusedElement: null,

  canUndo: false,
  canRedo: false,
  isAgentConnected: false,
  supportsUndo: false,
  supportsFollowUp: false,
  dismissButtonText: undefined,
  pendingAbortSessionId: null,

  contextMenuPosition: null,
  contextMenuElement: null,
  contextMenuClickOffset: null,

  selectedAgent: null,
});

interface GrabActions {
  startHold: (duration?: number) => void;
  release: () => void;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  freeze: () => void;
  unfreeze: () => void;
  startDrag: (position: Position) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  finishJustDragged: () => void;
  startCopy: () => void;
  completeCopy: (element?: Element) => void;
  finishJustCopied: () => void;
  enterPromptMode: (position: Position, element: Element) => void;
  exitPromptMode: () => void;
  setInputText: (value: string) => void;
  clearInputText: () => void;
  setPendingDismiss: (value: boolean) => void;
  setPointer: (position: Position) => void;
  setDetectedElement: (element: Element | null) => void;
  setFrozenElement: (element: Element) => void;
  setFrozenElements: (elements: Element[]) => void;
  setFrozenDragRect: (rect: FrozenDragRect | null) => void;
  clearFrozenElement: () => void;
  setCopyStart: (position: Position, element: Element) => void;
  setLastGrabbed: (element: Element | null) => void;
  setLastCopied: (element: Element | null) => void;
  clearLastCopied: () => void;
  setWasActivatedByToggle: (value: boolean) => void;
  setTouchMode: (value: boolean) => void;
  setSelectionSource: (
    filePath: string | null,
    lineNumber: number | null,
  ) => void;
  clearSelectionSource: () => void;
  setPendingClickData: (data: PendingClickData | null) => void;
  clearPendingClickData: () => void;
  setReplySessionId: (sessionId: string | null) => void;
  clearReplySessionId: () => void;
  incrementViewportVersion: () => void;
  addGrabbedBox: (box: GrabbedBox) => void;
  removeGrabbedBox: (boxId: string) => void;
  clearGrabbedBoxes: () => void;
  addLabelInstance: (instance: SelectionLabelInstance) => void;
  updateLabelInstance: (
    instanceId: string,
    status: SelectionLabelInstance["status"],
    errorMessage?: string,
  ) => void;
  removeLabelInstance: (instanceId: string) => void;
  removeLabelsForElement: (element: Element) => void;
  clearLabelInstances: () => void;
  setHasAgentProvider: (value: boolean) => void;
  setUndoRedoState: (canUndo: boolean, canRedo: boolean) => void;
  setAgentCapabilities: (capabilities: {
    supportsUndo: boolean;
    supportsFollowUp: boolean;
    dismissButtonText: string | undefined;
    isAgentConnected: boolean;
  }) => void;
  setPendingAbortSessionId: (sessionId: string | null) => void;
  updateSessionBounds: () => void;
  addAgentSession: (
    sessionId: string,
    session: AgentSession,
    element: Element,
  ) => void;
  updateAgentSessionStatus: (sessionId: string, status: string) => void;
  completeAgentSession: (sessionId: string, status?: string) => void;
  setAgentSessionError: (sessionId: string, error: string) => void;
  removeAgentSession: (sessionId: string) => void;
  showContextMenu: (position: Position, element: Element) => void;
  hideContextMenu: () => void;
  updateContextMenuPosition: () => void;
  setSelectedAgent: (agent: AgentOptions | null) => void;
  clearSelectedAgent: () => void;
}

const createGrabStore = (input: GrabStoreInput) => {
  const [store, setStore] = createStore<GrabStore>(createInitialStore(input));

  const isActive = () => store.current.state === "active";
  const isHolding = () => store.current.state === "holding";

  const actions: GrabActions = {
    startHold: (duration?: number) => {
      if (duration !== undefined) {
        setStore("keyHoldDuration", duration);
      }
      setStore("current", { state: "holding", startedAt: Date.now() });
    },

    release: () => {
      if (store.current.state === "holding") {
        setStore("current", { state: "idle" });
      }
    },

    activate: () => {
      setStore("current", {
        state: "active",
        phase: "hovering",
        isPromptMode: false,
        isPendingDismiss: false,
      });
      setStore("activationTimestamp", Date.now());
      setStore("previouslyFocusedElement", document.activeElement);
    },

    deactivate: () => {
      setStore("current", { state: "idle" });
      setStore("wasActivatedByToggle", false);
      setStore("inputText", "");
      setStore("frozenElement", null);
      setStore("frozenElements", []);
      setStore("frozenDragRect", null);
      setStore("pendingClickData", null);
      setStore("replySessionId", null);
      setStore("pendingAbortSessionId", null);
      setStore("activationTimestamp", null);
      setStore("previouslyFocusedElement", null);
      setStore("contextMenuPosition", null);
      setStore("contextMenuElement", null);
      setStore("contextMenuClickOffset", null);
      setStore("selectedAgent", null);
    },

    toggle: () => {
      if (store.activationTimestamp !== null) {
        actions.deactivate();
      } else {
        setStore("wasActivatedByToggle", true);
        actions.activate();
      }
    },

    freeze: () => {
      if (store.current.state === "active") {
        const elementToFreeze = store.frozenElement ?? store.detectedElement;
        if (elementToFreeze) {
          setStore("frozenElement", elementToFreeze);
        }
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "frozen";
            }
          }),
        );
      }
    },

    unfreeze: () => {
      if (store.current.state === "active") {
        setStore("frozenElement", null);
        setStore("frozenElements", []);
        setStore("frozenDragRect", null);
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "hovering";
            }
          }),
        );
      }
    },

    startDrag: (position: Position) => {
      if (store.current.state === "active") {
        actions.clearFrozenElement();
        setStore("dragStart", {
          x: position.x + window.scrollX,
          y: position.y + window.scrollY,
        });
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "dragging";
            }
          }),
        );
      }
    },

    endDrag: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "dragging"
      ) {
        setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "justDragged";
            }
          }),
        );
      }
    },

    cancelDrag: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "dragging"
      ) {
        setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "hovering";
            }
          }),
        );
      }
    },

    finishJustDragged: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "justDragged"
      ) {
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.phase = "hovering";
            }
          }),
        );
      }
    },

    startCopy: () => {
      const wasActive = store.current.state === "active";
      setStore("current", {
        state: "copying",
        startedAt: Date.now(),
        wasActive,
      });
    },

    completeCopy: (element?: Element) => {
      setStore("pendingClickData", null);
      if (element) {
        setStore("lastCopiedElement", element);
      }
      const wasActive =
        store.current.state === "copying" ? store.current.wasActive : false;
      setStore("current", {
        state: "justCopied",
        copiedAt: Date.now(),
        wasActive,
      });
    },

    finishJustCopied: () => {
      if (store.current.state === "justCopied") {
        const shouldReturnToActive =
          store.current.wasActive && !store.wasActivatedByToggle;
        if (shouldReturnToActive) {
          setStore("current", {
            state: "active",
            phase: "hovering",
            isPromptMode: false,
            isPendingDismiss: false,
          });
        } else {
          actions.deactivate();
        }
      }
    },

    enterPromptMode: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const selectionCenterX = bounds.x + bounds.width / 2;

      setStore("copyStart", position);
      setStore("copyOffsetFromCenterX", position.x - selectionCenterX);
      setStore("pointer", position);
      setStore("frozenElement", element);
      setStore("wasActivatedByToggle", true);

      if (store.current.state !== "active") {
        setStore("current", {
          state: "active",
          phase: "frozen",
          isPromptMode: true,
          isPendingDismiss: false,
        });
        setStore("activationTimestamp", Date.now());
        setStore("previouslyFocusedElement", document.activeElement);
      } else {
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.isPromptMode = true;
              current.phase = "frozen";
            }
          }),
        );
      }
    },

    exitPromptMode: () => {
      if (store.current.state === "active") {
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.isPromptMode = false;
              current.isPendingDismiss = false;
            }
          }),
        );
      }
    },

    setInputText: (value: string) => {
      setStore("inputText", value);
    },

    clearInputText: () => {
      setStore("inputText", "");
    },

    setPendingDismiss: (value: boolean) => {
      if (store.current.state === "active") {
        setStore(
          "current",
          produce((current) => {
            if (current.state === "active") {
              current.isPendingDismiss = value;
            }
          }),
        );
      }
    },

    setPointer: (position: Position) => {
      setStore("pointer", position);
    },

    setDetectedElement: (element: Element | null) => {
      setStore("detectedElement", element);
    },

    setFrozenElement: (element: Element) => {
      setStore("frozenElement", element);
      setStore("frozenElements", [element]);
      setStore("frozenDragRect", null);
    },

    setFrozenElements: (elements: Element[]) => {
      setStore("frozenElements", elements);
      setStore("frozenElement", elements.length > 0 ? elements[0] : null);
      setStore("frozenDragRect", null);
    },

    setFrozenDragRect: (rect: FrozenDragRect | null) => {
      setStore("frozenDragRect", rect);
    },

    clearFrozenElement: () => {
      setStore("frozenElement", null);
      setStore("frozenElements", []);
      setStore("frozenDragRect", null);
    },

    setCopyStart: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const selectionCenterX = bounds.x + bounds.width / 2;
      setStore("copyStart", position);
      setStore("copyOffsetFromCenterX", position.x - selectionCenterX);
    },

    setLastGrabbed: (element: Element | null) => {
      setStore("lastGrabbedElement", element);
    },

    setLastCopied: (element: Element | null) => {
      setStore("lastCopiedElement", element);
    },

    clearLastCopied: () => {
      setStore("lastCopiedElement", null);
    },

    setWasActivatedByToggle: (value: boolean) => {
      setStore("wasActivatedByToggle", value);
    },

    setTouchMode: (value: boolean) => {
      setStore("isTouchMode", value);
    },

    setSelectionSource: (
      filePath: string | null,
      lineNumber: number | null,
    ) => {
      setStore("selectionFilePath", filePath);
      setStore("selectionLineNumber", lineNumber);
    },

    clearSelectionSource: () => {
      setStore("selectionFilePath", null);
      setStore("selectionLineNumber", null);
    },

    setPendingClickData: (data: PendingClickData | null) => {
      setStore("pendingClickData", data);
    },

    clearPendingClickData: () => {
      setStore("pendingClickData", null);
    },

    setReplySessionId: (sessionId: string | null) => {
      setStore("replySessionId", sessionId);
    },

    clearReplySessionId: () => {
      setStore("replySessionId", null);
    },

    incrementViewportVersion: () => {
      setStore("viewportVersion", (version) => version + 1);
    },

    addGrabbedBox: (box: GrabbedBox) => {
      setStore("grabbedBoxes", (boxes) => [...boxes, box]);
    },

    removeGrabbedBox: (boxId: string) => {
      setStore("grabbedBoxes", (boxes) =>
        boxes.filter((box) => box.id !== boxId),
      );
    },

    clearGrabbedBoxes: () => {
      setStore("grabbedBoxes", []);
    },

    addLabelInstance: (instance: SelectionLabelInstance) => {
      setStore("labelInstances", (instances) => [...instances, instance]);
    },

    updateLabelInstance: (
      instanceId: string,
      status: SelectionLabelInstance["status"],
      errorMessage?: string,
    ) => {
      const index = store.labelInstances.findIndex(
        (instance) => instance.id === instanceId,
      );
      if (index !== -1) {
        setStore(
          "labelInstances",
          index,
          produce((instance) => {
            instance.status = status;
            if (errorMessage !== undefined) {
              instance.errorMessage = errorMessage;
            }
          }),
        );
      }
    },

    removeLabelInstance: (instanceId: string) => {
      setStore("labelInstances", (instances) =>
        instances.filter((instance) => instance.id !== instanceId),
      );
    },

    removeLabelsForElement: (element: Element) => {
      setStore("labelInstances", (instances) =>
        instances.filter((instance) => instance.element !== element),
      );
    },

    clearLabelInstances: () => {
      setStore("labelInstances", []);
    },

    setHasAgentProvider: (value: boolean) => {
      setStore("hasAgentProvider", value);
    },

    setUndoRedoState: (canUndo: boolean, canRedo: boolean) => {
      setStore("canUndo", canUndo);
      setStore("canRedo", canRedo);
    },

    setAgentCapabilities: (capabilities) => {
      setStore("supportsUndo", capabilities.supportsUndo);
      setStore("supportsFollowUp", capabilities.supportsFollowUp);
      setStore("dismissButtonText", capabilities.dismissButtonText);
      setStore("isAgentConnected", capabilities.isAgentConnected);
    },

    setPendingAbortSessionId: (sessionId: string | null) => {
      setStore("pendingAbortSessionId", sessionId);
    },

    updateSessionBounds: () => {
      const currentSessions = store.agentSessions;
      if (currentSessions.size === 0) return;

      const updatedSessions = new Map(currentSessions);
      let didUpdate = false;

      for (const [sessionId, session] of currentSessions) {
        const element = store.sessionElements.get(sessionId);
        if (element && document.contains(element)) {
          const newBounds = createElementBounds(element);
          const oldFirstBounds = session.selectionBounds[0];
          let updatedPosition = session.position;

          if (oldFirstBounds) {
            const oldCenterX = oldFirstBounds.x + oldFirstBounds.width / 2;
            const oldHalfWidth = oldFirstBounds.width / 2;
            const offsetX = session.position.x - oldCenterX;
            const offsetRatio = oldHalfWidth > 0 ? offsetX / oldHalfWidth : 0;
            const newCenterX = newBounds.x + newBounds.width / 2;
            const newHalfWidth = newBounds.width / 2;
            updatedPosition = {
              ...session.position,
              x: newCenterX + offsetRatio * newHalfWidth,
            };
          }

          updatedSessions.set(sessionId, {
            ...session,
            selectionBounds: [newBounds],
            position: updatedPosition,
          });
          didUpdate = true;
        }
      }

      if (didUpdate) {
        setStore("agentSessions", updatedSessions);
      }
    },

    addAgentSession: (
      sessionId: string,
      session: AgentSession,
      element: Element,
    ) => {
      const newSessions = new Map(store.agentSessions);
      newSessions.set(sessionId, session);
      setStore("agentSessions", newSessions);

      const newSessionElements = new Map(store.sessionElements);
      newSessionElements.set(sessionId, element);
      setStore("sessionElements", newSessionElements);
    },

    updateAgentSessionStatus: (sessionId: string, status: string) => {
      const session = store.agentSessions.get(sessionId);
      if (!session) return;

      const newSessions = new Map(store.agentSessions);
      newSessions.set(sessionId, { ...session, lastStatus: status });
      setStore("agentSessions", newSessions);
    },

    completeAgentSession: (sessionId: string, status?: string) => {
      const session = store.agentSessions.get(sessionId);
      if (!session) return;

      const newSessions = new Map(store.agentSessions);
      newSessions.set(sessionId, {
        ...session,
        isStreaming: false,
        lastStatus: status ?? session.lastStatus,
      });
      setStore("agentSessions", newSessions);
    },

    setAgentSessionError: (sessionId: string, error: string) => {
      const session = store.agentSessions.get(sessionId);
      if (!session) return;

      const newSessions = new Map(store.agentSessions);
      newSessions.set(sessionId, { ...session, isStreaming: false, error });
      setStore("agentSessions", newSessions);
    },

    removeAgentSession: (sessionId: string) => {
      const newSessions = new Map(store.agentSessions);
      newSessions.delete(sessionId);
      setStore("agentSessions", newSessions);

      const newSessionElements = new Map(store.sessionElements);
      newSessionElements.delete(sessionId);
      setStore("sessionElements", newSessionElements);
    },

    showContextMenu: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      setStore("contextMenuPosition", position);
      setStore("contextMenuElement", element);
      setStore("contextMenuClickOffset", {
        x: position.x - centerX,
        y: position.y - centerY,
      });
    },

    hideContextMenu: () => {
      setStore("contextMenuPosition", null);
      setStore("contextMenuElement", null);
      setStore("contextMenuClickOffset", null);
    },

    updateContextMenuPosition: () => {
      const element = store.contextMenuElement;
      const clickOffset = store.contextMenuClickOffset;

      if (!element || !clickOffset) return;
      if (!document.contains(element)) return;

      const newBounds = createElementBounds(element);
      const newCenterX = newBounds.x + newBounds.width / 2;
      const newCenterY = newBounds.y + newBounds.height / 2;

      setStore("contextMenuPosition", {
        x: newCenterX + clickOffset.x,
        y: newCenterY + clickOffset.y,
      });
    },

    setSelectedAgent: (agent: AgentOptions | null) => {
      setStore("selectedAgent", agent);
    },

    clearSelectedAgent: () => {
      setStore("selectedAgent", null);
    },
  };

  return { store, setStore, actions, isActive, isHolding };
};

export { createGrabStore };
