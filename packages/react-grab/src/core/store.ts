import { createStore, storePath } from "solid-js";
import type {
  Position,
  Theme,
  GrabbedBox,
  SelectionLabelInstance,
  AgentOptions,
} from "../types.js";
import { OFFSCREEN_POSITION } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { isElementConnected } from "../utils/is-element-connected.js";

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
  pendingCommentMode: boolean;
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

  isTouchMode: boolean;

  theme: Required<Theme>;

  activationTimestamp: number | null;
  previouslyFocusedElement: Element | null;

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
  pendingCommentMode: false,
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

  isTouchMode: false,

  theme: input.theme,

  activationTimestamp: null,
  previouslyFocusedElement: null,

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
  releaseHold: () => void;
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
  clearLastCopied: () => void;
  setWasActivatedByToggle: (value: boolean) => void;
  setPendingCommentMode: (value: boolean) => void;
  setTouchMode: (value: boolean) => void;
  setSelectionSource: (
    filePath: string | null,
    lineNumber: number | null,
  ) => void;
  setPendingClickData: (data: PendingClickData | null) => void;
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
  clearLabelInstances: () => void;
  setHasAgentProvider: (value: boolean) => void;
  setAgentCapabilities: (capabilities: {
    supportsUndo: boolean;
    supportsFollowUp: boolean;
    dismissButtonText: string | undefined;
    isAgentConnected: boolean;
  }) => void;
  setPendingAbortSessionId: (sessionId: string | null) => void;
  showContextMenu: (position: Position, element: Element) => void;
  hideContextMenu: () => void;
  updateContextMenuPosition: () => void;
  setSelectedAgent: (agent: AgentOptions | null) => void;
}

const createGrabStore = (input: GrabStoreInput) => {
  const [store, setStore] = createStore<GrabStore>(createInitialStore(input));

  const setActivePhase = (phase: GrabPhase) => {
    setStore((draft) => {
      if (draft.current.state === "active") {
        draft.current.phase = phase;
      }
    });
  };

  const actions: GrabActions = {
    startHold: (duration?: number) => {
      setStore((draft) => {
        if (duration !== undefined) {
          draft.keyHoldDuration = duration;
        }
        draft.current = { state: "holding", startedAt: Date.now() };
      });
    },

    releaseHold: () => {
      if (store.current.state === "holding") {
        setStore(storePath("current", { state: "idle" } as GrabState));
      }
    },

    activate: () => {
      setStore((draft) => {
        draft.current = {
          state: "active",
          phase: "hovering",
          isPromptMode: false,
          isPendingDismiss: false,
        };
        draft.activationTimestamp = Date.now();
        draft.previouslyFocusedElement = document.activeElement;
      });
    },

    deactivate: () => {
      setStore((draft) => {
        draft.current = { state: "idle" };
        draft.wasActivatedByToggle = false;
        draft.pendingCommentMode = false;
        draft.inputText = "";
        draft.frozenElement = null;
        draft.frozenElements = [];
        draft.frozenDragRect = null;
        draft.pendingClickData = null;
        draft.replySessionId = null;
        draft.pendingAbortSessionId = null;
        draft.activationTimestamp = null;
        draft.previouslyFocusedElement = null;
        draft.contextMenuPosition = null;
        draft.contextMenuElement = null;
        draft.contextMenuClickOffset = null;
        draft.selectedAgent = null;
        draft.lastCopiedElement = null;
      });
    },

    toggle: () => {
      if (store.activationTimestamp !== null) {
        actions.deactivate();
      } else {
        setStore(storePath("wasActivatedByToggle", true));
        actions.activate();
      }
    },

    freeze: () => {
      if (store.current.state === "active") {
        const elementToFreeze = store.frozenElement ?? store.detectedElement;
        if (elementToFreeze) {
          setStore(storePath("frozenElement", elementToFreeze));
        }
        setActivePhase("frozen");
      }
    },

    unfreeze: () => {
      if (store.current.state === "active") {
        setStore((draft) => {
          draft.frozenElement = null;
          draft.frozenElements = [];
          draft.frozenDragRect = null;
        });
        setActivePhase("hovering");
      }
    },

    startDrag: (position: Position) => {
      if (store.current.state === "active") {
        actions.clearFrozenElement();
        setStore(
          storePath("dragStart", {
            x: position.x + window.scrollX,
            y: position.y + window.scrollY,
          }),
        );
        setActivePhase("dragging");
      }
    },

    endDrag: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "dragging"
      ) {
        setStore(
          storePath("dragStart", {
            x: OFFSCREEN_POSITION,
            y: OFFSCREEN_POSITION,
          }),
        );
        setActivePhase("justDragged");
      }
    },

    cancelDrag: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "dragging"
      ) {
        setStore(
          storePath("dragStart", {
            x: OFFSCREEN_POSITION,
            y: OFFSCREEN_POSITION,
          }),
        );
        setActivePhase("hovering");
      }
    },

    finishJustDragged: () => {
      if (
        store.current.state === "active" &&
        store.current.phase === "justDragged"
      ) {
        setActivePhase("hovering");
      }
    },

    startCopy: () => {
      const wasActive = store.current.state === "active";
      setStore(
        storePath("current", {
          state: "copying",
          startedAt: Date.now(),
          wasActive,
        } as GrabState),
      );
    },

    completeCopy: (element?: Element) => {
      const wasActive =
        store.current.state === "copying" ? store.current.wasActive : false;
      setStore((draft) => {
        draft.pendingClickData = null;
        if (element) {
          draft.lastCopiedElement = element;
        }
        draft.current = {
          state: "justCopied",
          copiedAt: Date.now(),
          wasActive,
        };
      });
    },

    finishJustCopied: () => {
      if (store.current.state === "justCopied") {
        const shouldReturnToActive =
          store.current.wasActive && !store.wasActivatedByToggle;
        if (shouldReturnToActive) {
          actions.clearFrozenElement();
          setStore(
            storePath("current", {
              state: "active",
              phase: "hovering",
              isPromptMode: false,
              isPendingDismiss: false,
            } as GrabState),
          );
        } else {
          actions.deactivate();
        }
      }
    },

    enterPromptMode: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const selectionCenterX = bounds.x + bounds.width / 2;

      setStore((draft) => {
        draft.copyStart = position;
        draft.copyOffsetFromCenterX = position.x - selectionCenterX;
        draft.pointer = position;
        draft.frozenElement = element;
        draft.wasActivatedByToggle = true;
      });

      if (store.current.state !== "active") {
        setStore((draft) => {
          draft.current = {
            state: "active",
            phase: "frozen",
            isPromptMode: true,
            isPendingDismiss: false,
          };
          draft.activationTimestamp = Date.now();
          draft.previouslyFocusedElement = document.activeElement;
        });
      } else {
        setStore((draft) => {
          if (draft.current.state === "active") {
            draft.current.isPromptMode = true;
            draft.current.phase = "frozen";
          }
        });
      }
    },

    exitPromptMode: () => {
      if (store.current.state === "active") {
        setStore((draft) => {
          if (draft.current.state === "active") {
            draft.current.isPromptMode = false;
            draft.current.isPendingDismiss = false;
          }
        });
      }
    },

    setInputText: (value: string) => {
      setStore(storePath("inputText", value));
    },

    clearInputText: () => {
      setStore(storePath("inputText", ""));
    },

    setPendingDismiss: (value: boolean) => {
      if (store.current.state === "active") {
        setStore((draft) => {
          if (draft.current.state === "active") {
            draft.current.isPendingDismiss = value;
          }
        });
      }
    },

    setPointer: (position: Position) => {
      setStore(storePath("pointer", position));
    },

    setDetectedElement: (element: Element | null) => {
      setStore(storePath("detectedElement", element));
    },

    setFrozenElement: (element: Element) => {
      setStore((draft) => {
        draft.frozenElement = element;
        draft.frozenElements = [element];
        draft.frozenDragRect = null;
      });
    },

    setFrozenElements: (elements: Element[]) => {
      setStore((draft) => {
        draft.frozenElements = elements;
        draft.frozenElement = elements.length > 0 ? elements[0] : null;
        draft.frozenDragRect = null;
      });
    },

    setFrozenDragRect: (rect: FrozenDragRect | null) => {
      setStore(storePath("frozenDragRect", rect));
    },

    clearFrozenElement: () => {
      setStore((draft) => {
        draft.frozenElement = null;
        draft.frozenElements = [];
        draft.frozenDragRect = null;
      });
    },

    setCopyStart: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const selectionCenterX = bounds.x + bounds.width / 2;
      setStore((draft) => {
        draft.copyStart = position;
        draft.copyOffsetFromCenterX = position.x - selectionCenterX;
      });
    },

    setLastGrabbed: (element: Element | null) => {
      setStore(storePath("lastGrabbedElement", element));
    },

    clearLastCopied: () => {
      setStore(storePath("lastCopiedElement", null));
    },

    setWasActivatedByToggle: (value: boolean) => {
      setStore(storePath("wasActivatedByToggle", value));
    },

    setPendingCommentMode: (value: boolean) => {
      setStore(storePath("pendingCommentMode", value));
    },

    setTouchMode: (value: boolean) => {
      setStore(storePath("isTouchMode", value));
    },

    setSelectionSource: (
      filePath: string | null,
      lineNumber: number | null,
    ) => {
      setStore((draft) => {
        draft.selectionFilePath = filePath;
        draft.selectionLineNumber = lineNumber;
      });
    },

    setPendingClickData: (data: PendingClickData | null) => {
      setStore(storePath("pendingClickData", data));
    },

    clearReplySessionId: () => {
      setStore(storePath("replySessionId", null));
    },

    incrementViewportVersion: () => {
      setStore(storePath("viewportVersion", (version) => version + 1));
    },

    addGrabbedBox: (box: GrabbedBox) => {
      setStore(storePath("grabbedBoxes", (boxes) => [...boxes, box]));
    },

    removeGrabbedBox: (boxId: string) => {
      setStore(
        storePath("grabbedBoxes", (boxes) =>
          boxes.filter((innerBox) => innerBox.id !== boxId),
        ),
      );
    },

    clearGrabbedBoxes: () => {
      setStore(storePath("grabbedBoxes", []));
    },

    addLabelInstance: (instance: SelectionLabelInstance) => {
      setStore(
        storePath("labelInstances", (instances) => [...instances, instance]),
      );
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
        setStore(storePath("labelInstances", index, "status", status));
        if (errorMessage !== undefined) {
          setStore(
            storePath("labelInstances", index, "errorMessage", errorMessage),
          );
        }
      }
    },

    removeLabelInstance: (instanceId: string) => {
      setStore(
        storePath("labelInstances", (instances) =>
          instances.filter((instance) => instance.id !== instanceId),
        ),
      );
    },

    clearLabelInstances: () => {
      setStore(storePath("labelInstances", []));
    },

    setHasAgentProvider: (value: boolean) => {
      setStore(storePath("hasAgentProvider", value));
    },

    setAgentCapabilities: (capabilities) => {
      setStore((draft) => {
        draft.supportsUndo = capabilities.supportsUndo;
        draft.supportsFollowUp = capabilities.supportsFollowUp;
        draft.dismissButtonText = capabilities.dismissButtonText;
        draft.isAgentConnected = capabilities.isAgentConnected;
      });
    },

    setPendingAbortSessionId: (sessionId: string | null) => {
      setStore(storePath("pendingAbortSessionId", sessionId));
    },

    showContextMenu: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      setStore((draft) => {
        draft.contextMenuPosition = position;
        draft.contextMenuElement = element;
        draft.contextMenuClickOffset = {
          x: position.x - centerX,
          y: position.y - centerY,
        };
      });
    },

    hideContextMenu: () => {
      setStore((draft) => {
        draft.contextMenuPosition = null;
        draft.contextMenuElement = null;
        draft.contextMenuClickOffset = null;
      });
    },

    updateContextMenuPosition: () => {
      const element = store.contextMenuElement;
      const clickOffset = store.contextMenuClickOffset;

      if (!element || !clickOffset) return;
      if (!isElementConnected(element)) return;

      const newBounds = createElementBounds(element);
      const newCenterX = newBounds.x + newBounds.width / 2;
      const newCenterY = newBounds.y + newBounds.height / 2;

      setStore(
        storePath("contextMenuPosition", {
          x: newCenterX + clickOffset.x,
          y: newCenterY + clickOffset.y,
        }),
      );
    },

    setSelectedAgent: (agent: AgentOptions | null) => {
      setStore(storePath("selectedAgent", agent));
    },
  };

  return { store, actions };
};

export { createGrabStore };
