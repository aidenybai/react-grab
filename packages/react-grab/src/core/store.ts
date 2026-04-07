import { createStore, produce } from "solid-js/store";
import type { Position, Theme, GrabbedBox, SelectionLabelInstance } from "../types.js";
import { OFFSCREEN_POSITION } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isElementConnected } from "../utils/is-element-connected.js";

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

  viewportVersion: number;
  grabbedBoxes: GrabbedBox[];
  labelInstances: SelectionLabelInstance[];

  isTouchMode: boolean;

  theme: Required<Theme>;

  activationTimestamp: number | null;
  previouslyFocusedElement: Element | null;

  contextMenuPosition: Position | null;
  contextMenuElement: Element | null;
  contextMenuClickOffset: Position | null;
}

interface GrabStoreInput {
  theme: Required<Theme>;
  keyHoldDuration: number;
}

const createInitialStore = (input: GrabStoreInput): GrabStore => ({
  current: { state: "idle" },

  wasActivatedByToggle: false,
  pendingCommentMode: false,
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

  viewportVersion: 0,
  grabbedBoxes: [],
  labelInstances: [],

  isTouchMode: false,

  theme: input.theme,

  activationTimestamp: null,
  previouslyFocusedElement: null,

  contextMenuPosition: null,
  contextMenuElement: null,
  contextMenuClickOffset: null,
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
  shiftDragStart: (delta: Position) => void;
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
  setCopyStart: (position: Position, element: Element) => void;
  setLastGrabbed: (element: Element | null) => void;
  clearLastCopied: () => void;
  setWasActivatedByToggle: (value: boolean) => void;
  setPendingCommentMode: (value: boolean) => void;
  setTouchMode: (value: boolean) => void;
  setSelectionSource: (filePath: string | null, lineNumber: number | null) => void;
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
  showContextMenu: (position: Position, element: Element) => void;
  hideContextMenu: () => void;
  updateContextMenuPosition: () => void;
}

const createGrabStore = (input: GrabStoreInput) => {
  const [store, setStore] = createStore<GrabStore>(createInitialStore(input));

  const clearFrozenElement = () => {
    setStore(
      produce((draft) => {
        draft.frozenElement = null;
        draft.frozenElements = [];
        draft.frozenDragRect = null;
      }),
    );
  };

  const setActivePhase = (phase: GrabPhase) => {
    setStore(
      "current",
      produce((current) => {
        if (current.state === "active") {
          current.phase = phase;
        }
      }),
    );
  };

  const actions: GrabActions = {
    startHold: (duration?: number) => {
      if (duration !== undefined) {
        setStore("keyHoldDuration", duration);
      }
      setStore("current", { state: "holding", startedAt: Date.now() });
    },

    releaseHold: () => {
      if (store.current.state === "holding") {
        setStore("current", { state: "idle" });
      }
    },

    activate: () => {
      setStore(
        produce((draft) => {
          draft.current = {
            state: "active",
            phase: "hovering",
            isPromptMode: false,
            isPendingDismiss: false,
          };
          draft.activationTimestamp = Date.now();
          draft.previouslyFocusedElement = document.activeElement;
        }),
      );
    },

    deactivate: () => {
      setStore(
        produce((draft) => {
          draft.current = { state: "idle" };
          draft.wasActivatedByToggle = false;
          draft.pendingCommentMode = false;
          draft.inputText = "";
          draft.frozenElement = null;
          draft.frozenElements = [];
          draft.frozenDragRect = null;
          draft.activationTimestamp = null;
          draft.previouslyFocusedElement = null;
          draft.contextMenuPosition = null;
          draft.contextMenuElement = null;
          draft.contextMenuClickOffset = null;
          draft.lastCopiedElement = null;
        }),
      );
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
        setActivePhase("frozen");
      }
    },

    unfreeze: () => {
      if (store.current.state === "active") {
        setStore(
          produce((draft) => {
            draft.frozenElement = null;
            draft.frozenElements = [];
            draft.frozenDragRect = null;
          }),
        );
        setActivePhase("hovering");
      }
    },

    startDrag: (position: Position) => {
      if (store.current.state === "active") {
        clearFrozenElement();
        setStore("dragStart", {
          x: position.x + window.scrollX,
          y: position.y + window.scrollY,
        });
        setActivePhase("dragging");
      }
    },

    shiftDragStart: (delta: Position) => {
      if (store.current.state === "active" && store.current.phase === "dragging") {
        setStore("dragStart", (dragStart) => ({
          x: dragStart.x + delta.x,
          y: dragStart.y + delta.y,
        }));
      }
    },

    endDrag: () => {
      if (store.current.state === "active" && store.current.phase === "dragging") {
        setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
        setActivePhase("justDragged");
      }
    },

    cancelDrag: () => {
      if (store.current.state === "active" && store.current.phase === "dragging") {
        setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
        setActivePhase("hovering");
      }
    },

    finishJustDragged: () => {
      if (store.current.state === "active" && store.current.phase === "justDragged") {
        setActivePhase("hovering");
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
      if (element) {
        setStore("lastCopiedElement", element);
      }
      const wasActive = store.current.state === "copying" ? store.current.wasActive : false;
      setStore("current", {
        state: "justCopied",
        copiedAt: Date.now(),
        wasActive,
      });
    },

    finishJustCopied: () => {
      if (store.current.state === "justCopied") {
        const shouldReturnToActive = store.current.wasActive && !store.wasActivatedByToggle;
        if (shouldReturnToActive) {
          clearFrozenElement();
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
      const { x: selectionCenterX } = getBoundsCenter(bounds);

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
      setStore(
        produce((draft) => {
          draft.frozenElement = element;
          draft.frozenElements = [element];
          draft.frozenDragRect = null;
        }),
      );
    },

    setFrozenElements: (elements: Element[]) => {
      setStore(
        produce((draft) => {
          draft.frozenElements = elements;
          draft.frozenElement = elements.length > 0 ? elements[0] : null;
          draft.frozenDragRect = null;
        }),
      );
    },

    setFrozenDragRect: (rect: FrozenDragRect | null) => {
      setStore("frozenDragRect", rect);
    },

    setCopyStart: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const { x: selectionCenterX } = getBoundsCenter(bounds);
      setStore("copyStart", position);
      setStore("copyOffsetFromCenterX", position.x - selectionCenterX);
    },

    setLastGrabbed: (element: Element | null) => {
      setStore("lastGrabbedElement", element);
    },

    clearLastCopied: () => {
      setStore("lastCopiedElement", null);
    },

    setWasActivatedByToggle: (value: boolean) => {
      setStore("wasActivatedByToggle", value);
    },

    setPendingCommentMode: (value: boolean) => {
      setStore("pendingCommentMode", value);
    },

    setTouchMode: (value: boolean) => {
      setStore("isTouchMode", value);
    },

    setSelectionSource: (filePath: string | null, lineNumber: number | null) => {
      setStore(
        produce((draft) => {
          draft.selectionFilePath = filePath;
          draft.selectionLineNumber = lineNumber;
        }),
      );
    },

    incrementViewportVersion: () => {
      setStore("viewportVersion", (version) => version + 1);
    },

    addGrabbedBox: (box: GrabbedBox) => {
      setStore("grabbedBoxes", (boxes) => [...boxes, box]);
    },

    removeGrabbedBox: (boxId: string) => {
      setStore("grabbedBoxes", (boxes) => boxes.filter((box) => box.id !== boxId));
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
      const index = store.labelInstances.findIndex((instance) => instance.id === instanceId);
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

    clearLabelInstances: () => {
      setStore("labelInstances", []);
    },

    showContextMenu: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const { x: centerX, y: centerY } = getBoundsCenter(bounds);
      setStore(
        produce((draft) => {
          draft.contextMenuPosition = position;
          draft.contextMenuElement = element;
          draft.contextMenuClickOffset = {
            x: position.x - centerX,
            y: position.y - centerY,
          };
        }),
      );
    },

    hideContextMenu: () => {
      setStore(
        produce((draft) => {
          draft.contextMenuPosition = null;
          draft.contextMenuElement = null;
          draft.contextMenuClickOffset = null;
        }),
      );
    },

    updateContextMenuPosition: () => {
      const element = store.contextMenuElement;
      const clickOffset = store.contextMenuClickOffset;

      if (!element || !clickOffset) return;
      if (!isElementConnected(element)) return;

      const newBounds = createElementBounds(element);
      const { x: newCenterX, y: newCenterY } = getBoundsCenter(newBounds);

      setStore("contextMenuPosition", {
        x: newCenterX + clickOffset.x,
        y: newCenterY + clickOffset.y,
      });
    },
  };

  return { store, actions };
};

export { createGrabStore };
