import { createStore, produce } from "solid-js/store";
import { batch, createSignal } from "solid-js";
import type { Position, GrabbedBox, SelectionLabelInstance } from "../types.js";
import { OFFSCREEN_POSITION } from "../constants.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getBoundsCenter } from "../utils/get-bounds-center.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { resolveLiveElement, trackElementFiber } from "../utils/resolve-live-element.js";

interface FrozenDragRect {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

type GrabPhase = "hovering" | "frozen" | "dragging-select" | "dragging-reposition" | "justDragged";

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
  selectionInteractionLockDepth: number;

  wasActivatedByToggle: boolean;
  pendingCommentMode: boolean;
  keyHoldDuration: number;

  dragStart: Position;
  copyStart: Position;
  copyOffsetFromCenterX: number;

  detectedElement: Element | null;
  frozenElement: Element | null;
  frozenElements: Element[];
  frozenDragRect: FrozenDragRect | null;
  lastGrabbedElement: Element | null;

  selectionFilePath: string | null;
  selectionLineNumber: number | null;

  inputText: string;

  grabbedBoxes: GrabbedBox[];
  labelInstances: SelectionLabelInstance[];

  isTouchMode: boolean;

  activationTimestamp: number | null;
  previouslyFocusedElement: Element | null;

  contextMenuPosition: Position | null;
  contextMenuElement: Element | null;
  contextMenuClickOffset: Position | null;
}

interface GrabStoreInput {
  keyHoldDuration: number;
}

// Returns the live element for a tracked slot: records the fiber while
// connected so a future swap can be recovered, and re-resolves the current node
// once it has detached. Keeps the old reference when recovery fails so callers
// never lose the slot to a transient null.
const relinkElement = (element: Element): Element => {
  if (element.isConnected) {
    trackElementFiber(element);
    return element;
  }
  const liveElement = resolveLiveElement(element);
  if (!liveElement) return element;
  trackElementFiber(liveElement);
  return liveElement;
};

// Re-resolves every element the overlay anchors to — the selection, the hover
// target, the context-menu target, and the post-copy "Copied" labels and
// grabbed-box flashes — so they all follow the same DOM swaps. Run on the
// recalc interval; assigning the same reference back is a no-op for solid, so
// connected elements produce no store notifications.
const relinkSlots = (draft: GrabStore): void => {
  for (let index = 0; index < draft.frozenElements.length; index += 1) {
    draft.frozenElements[index] = relinkElement(draft.frozenElements[index]);
  }
  // frozenElement mirrors frozenElements[0] when the array is populated (see
  // updateFrozenElements); it only stands alone in freeze / prompt mode, where
  // it is recovered on its own.
  draft.frozenElement =
    draft.frozenElements.length > 0
      ? draft.frozenElements[0]
      : draft.frozenElement && relinkElement(draft.frozenElement);
  draft.detectedElement = draft.detectedElement && relinkElement(draft.detectedElement);
  draft.contextMenuElement = draft.contextMenuElement && relinkElement(draft.contextMenuElement);

  for (const instance of draft.labelInstances) {
    if (instance.element) instance.element = relinkElement(instance.element);
    if (instance.elements) {
      for (let index = 0; index < instance.elements.length; index += 1) {
        instance.elements[index] = relinkElement(instance.elements[index]);
      }
    }
  }
  for (const box of draft.grabbedBoxes) {
    if (box.element) box.element = relinkElement(box.element);
  }
};

const createInitialStore = (input: GrabStoreInput): GrabStore => ({
  selectionInteractionLockDepth: 0,

  wasActivatedByToggle: false,
  pendingCommentMode: false,
  keyHoldDuration: input.keyHoldDuration,

  dragStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyOffsetFromCenterX: 0,

  detectedElement: null,
  frozenElement: null,
  frozenElements: [],
  frozenDragRect: null,
  lastGrabbedElement: null,

  selectionFilePath: null,
  selectionLineNumber: null,

  inputText: "",

  grabbedBoxes: [],
  labelInstances: [],

  isTouchMode: false,

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
  startDrag: (position: Position, shouldPreserveFrozenElements?: boolean) => void;
  startDragReposition: () => void;
  stopDragReposition: () => void;
  shiftDragStart: (delta: Position) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  finishJustDragged: () => void;
  startCopy: () => void;
  completeCopy: () => void;
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
  toggleFrozenElement: (element: Element) => void;
  addFrozenElements: (elements: Element[]) => void;
  setFrozenDragRect: (rect: FrozenDragRect | null) => void;
  relinkLiveElements: () => void;
  setCopyStart: (position: Position, element: Element) => void;
  setLastGrabbed: (element: Element | null) => void;
  setWasActivatedByToggle: (value: boolean) => void;
  setPendingCommentMode: (value: boolean) => void;
  setTouchMode: (value: boolean) => void;
  incrementSelectionInteractionLockDepth: () => void;
  decrementSelectionInteractionLockDepth: () => void;
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

  const [pointer, setPointer] = createSignal<Position>({
    x: OFFSCREEN_POSITION,
    y: OFFSCREEN_POSITION,
  });
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [current, setCurrent] = createSignal<GrabState>({ state: "idle" });

  const updateFrozenElements = (mutator: (draft: GrabStore) => void) => {
    setStore(
      produce((draft) => {
        mutator(draft);
        draft.frozenElement = draft.frozenElements.length > 0 ? draft.frozenElements[0] : null;
        draft.frozenDragRect = null;
      }),
    );
  };

  const clearFrozenElement = () => {
    updateFrozenElements((draft) => {
      draft.frozenElements = [];
    });
  };

  const setActivePhase = (phase: GrabPhase) => {
    setCurrent((prev) => (prev.state === "active" ? { ...prev, phase } : prev));
  };

  const actions: GrabActions = {
    startHold: (duration?: number) => {
      if (duration !== undefined) {
        setStore("keyHoldDuration", duration);
      }
      setCurrent({ state: "holding", startedAt: Date.now() });
    },

    releaseHold: () => {
      if (current().state === "holding") {
        setCurrent({ state: "idle" });
      }
    },

    activate: () => {
      batch(() => {
        setCurrent({
          state: "active",
          phase: "hovering",
          isPromptMode: false,
          isPendingDismiss: false,
        });
        setStore("activationTimestamp", Date.now());
        setStore("previouslyFocusedElement", document.activeElement);
      });
    },

    deactivate: () => {
      batch(() => {
        setCurrent({ state: "idle" });
        setStore(
          produce((draft) => {
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
            // In touch mode there is no pointer movement between taps, so a
            // stale detectedElement from the previous interaction would
            // render its selection box the moment the user re-activates.
            // Mouse mode refreshes this on the next pointermove.
            if (draft.isTouchMode) {
              draft.detectedElement = null;
            }
          }),
        );
      });
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
      if (current().state === "active") {
        const elementToFreeze = store.frozenElement ?? store.detectedElement;
        if (elementToFreeze) {
          setStore("frozenElement", elementToFreeze);
        }
        setActivePhase("frozen");
      }
    },

    unfreeze: () => {
      if (current().state === "active") {
        batch(() => {
          setStore(
            produce((draft) => {
              draft.frozenElement = null;
              draft.frozenElements = [];
              draft.frozenDragRect = null;
            }),
          );
          setActivePhase("hovering");
        });
      }
    },

    startDrag: (position: Position, shouldPreserveFrozenElements?: boolean) => {
      const currentState = current();
      if (currentState.state === "active") {
        batch(() => {
          if (!shouldPreserveFrozenElements) {
            clearFrozenElement();
          }
          setStore("dragStart", {
            x: position.x + window.scrollX,
            y: position.y + window.scrollY,
          });
          setActivePhase("dragging-select");
        });
      }
    },

    startDragReposition: () => {
      const currentState = current();
      if (currentState.state === "active" && currentState.phase === "dragging-select") {
        setActivePhase("dragging-reposition");
      }
    },

    stopDragReposition: () => {
      const currentState = current();
      if (currentState.state === "active" && currentState.phase === "dragging-reposition") {
        setActivePhase("dragging-select");
      }
    },

    shiftDragStart: (delta: Position) => {
      const currentState = current();
      if (currentState.state === "active" && currentState.phase === "dragging-reposition") {
        setStore("dragStart", (dragStart) => ({
          x: dragStart.x + delta.x,
          y: dragStart.y + delta.y,
        }));
      }
    },

    endDrag: () => {
      const currentState = current();
      if (
        currentState.state === "active" &&
        (currentState.phase === "dragging-select" || currentState.phase === "dragging-reposition")
      ) {
        batch(() => {
          setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
          setActivePhase("justDragged");
        });
      }
    },

    cancelDrag: () => {
      const currentState = current();
      if (
        currentState.state === "active" &&
        (currentState.phase === "dragging-select" || currentState.phase === "dragging-reposition")
      ) {
        batch(() => {
          setStore("dragStart", { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION });
          setActivePhase("hovering");
        });
      }
    },

    finishJustDragged: () => {
      const currentState = current();
      if (currentState.state === "active" && currentState.phase === "justDragged") {
        setActivePhase("hovering");
      }
    },

    startCopy: () => {
      const wasActive = current().state === "active";
      setCurrent({
        state: "copying",
        startedAt: Date.now(),
        wasActive,
      });
    },

    completeCopy: () => {
      const currentState = current();
      const wasActive = currentState.state === "copying" ? currentState.wasActive : false;
      setCurrent({
        state: "justCopied",
        copiedAt: Date.now(),
        wasActive,
      });
    },

    finishJustCopied: () => {
      const currentState = current();
      if (currentState.state === "justCopied") {
        const shouldReturnToActive = currentState.wasActive && !store.wasActivatedByToggle;
        if (shouldReturnToActive) {
          batch(() => {
            clearFrozenElement();
            setCurrent({
              state: "active",
              phase: "hovering",
              isPromptMode: false,
              isPendingDismiss: false,
            });
          });
        } else {
          actions.deactivate();
        }
      }
    },

    enterPromptMode: (position: Position, element: Element) => {
      const bounds = createElementBounds(element);
      const { x: selectionCenterX } = getBoundsCenter(bounds);

      batch(() => {
        setStore("copyStart", position);
        setStore("copyOffsetFromCenterX", position.x - selectionCenterX);
        setPointer(position);
        setStore("frozenElement", element);
        setStore("wasActivatedByToggle", true);

        if (current().state !== "active") {
          setCurrent({
            state: "active",
            phase: "frozen",
            isPromptMode: true,
            isPendingDismiss: false,
          });
          setStore("activationTimestamp", Date.now());
          setStore("previouslyFocusedElement", document.activeElement);
        } else {
          setCurrent((prev) =>
            prev.state === "active" ? { ...prev, isPromptMode: true, phase: "frozen" } : prev,
          );
        }
      });
    },

    exitPromptMode: () => {
      setCurrent((prev) =>
        prev.state === "active" ? { ...prev, isPromptMode: false, isPendingDismiss: false } : prev,
      );
    },

    setInputText: (value: string) => {
      setStore("inputText", value);
    },

    clearInputText: () => {
      setStore("inputText", "");
    },

    setPendingDismiss: (value: boolean) => {
      setCurrent((prev) => (prev.state === "active" ? { ...prev, isPendingDismiss: value } : prev));
    },

    setPointer: (position: Position) => {
      setPointer((previousPosition) =>
        previousPosition.x === position.x && previousPosition.y === position.y
          ? previousPosition
          : position,
      );
    },

    setDetectedElement: (element: Element | null) => {
      setStore("detectedElement", element);
    },

    setFrozenElement: (element: Element) => {
      updateFrozenElements((draft) => {
        draft.frozenElements = [element];
      });
    },

    setFrozenElements: (elements: Element[]) => {
      updateFrozenElements((draft) => {
        draft.frozenElements = elements;
      });
    },

    toggleFrozenElement: (element: Element) => {
      updateFrozenElements((draft) => {
        const existingIndex = draft.frozenElements.indexOf(element);
        if (existingIndex >= 0) {
          draft.frozenElements.splice(existingIndex, 1);
        } else {
          draft.frozenElements.push(element);
        }
      });
    },

    addFrozenElements: (elements: Element[]) => {
      updateFrozenElements((draft) => {
        for (const incomingElement of elements) {
          if (!draft.frozenElements.includes(incomingElement)) {
            draft.frozenElements.push(incomingElement);
          }
        }
      });
    },

    setFrozenDragRect: (rect: FrozenDragRect | null) => {
      setStore("frozenDragRect", rect);
    },

    relinkLiveElements: () => {
      setStore(produce(relinkSlots));
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

    setWasActivatedByToggle: (value: boolean) => {
      setStore("wasActivatedByToggle", value);
    },

    setPendingCommentMode: (value: boolean) => {
      setStore("pendingCommentMode", value);
    },

    setTouchMode: (value: boolean) => {
      setStore("isTouchMode", value);
    },

    incrementSelectionInteractionLockDepth: () => {
      setStore("selectionInteractionLockDepth", (currentLockDepth) => currentLockDepth + 1);
    },

    decrementSelectionInteractionLockDepth: () => {
      setStore("selectionInteractionLockDepth", (currentLockDepth) =>
        Math.max(0, currentLockDepth - 1),
      );
    },

    setSelectionSource: (filePath: string | null, lineNumber: number | null) => {
      batch(() => {
        setStore("selectionFilePath", filePath);
        setStore("selectionLineNumber", lineNumber);
      });
    },

    incrementViewportVersion: () => {
      setViewportVersion((version) => version + 1);
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
        batch(() => {
          setStore("labelInstances", index, "status", status);
          if (errorMessage !== undefined) {
            setStore("labelInstances", index, "errorMessage", errorMessage);
          } else if (status !== "error") {
            // errorMessage is only meaningful in the error state; leaving it set
            // after a retry (copying) or success (copied) keeps the Retry/Ok
            // panel visible, since the view renders on the message, not status.
            setStore("labelInstances", index, "errorMessage", undefined);
          }
        });
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
      batch(() => {
        setStore("contextMenuPosition", position);
        setStore("contextMenuElement", element);
        setStore("contextMenuClickOffset", {
          x: position.x - centerX,
          y: position.y - centerY,
        });
      });
    },

    hideContextMenu: () => {
      batch(() => {
        setStore("contextMenuPosition", null);
        setStore("contextMenuElement", null);
        setStore("contextMenuClickOffset", null);
      });
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

  return { store, actions, pointer, viewportVersion, current };
};

export { createGrabStore };
