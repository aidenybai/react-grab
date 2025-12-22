import { setup, assign } from "xstate";
import type {
  Theme,
  GrabbedBox,
  SelectionLabelInstance,
  AgentSession,
} from "../types.js";
import {
  DOUBLE_CLICK_THRESHOLD_MS,
  SUCCESS_LABEL_DURATION_MS,
  COPIED_LABEL_DURATION_MS,
  OFFSCREEN_POSITION,
} from "../constants.js";
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

interface GrabMachineContext {
  isToggleMode: boolean;
  hasAgentProvider: boolean;
  keyHoldDuration: number;

  mousePosition: { x: number; y: number };
  dragStart: { x: number; y: number };
  copyStart: { x: number; y: number };
  copyOffsetFromCenterX: number;

  detectedElement: Element | null;
  frozenElement: Element | null;
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

  nativeSelectionCursor: { x: number; y: number };
  nativeSelectionElements: Element[];

  agentSessions: Map<string, AgentSession>;
  sessionElements: Map<string, Element>;
  abortControllers: Map<string, AbortController>;

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
}

const createInitialContext = (theme: Required<Theme>): GrabMachineContext => ({
  isToggleMode: false,
  hasAgentProvider: false,
  keyHoldDuration: 200,

  mousePosition: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  dragStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyStart: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  copyOffsetFromCenterX: 0,

  detectedElement: null,
  frozenElement: null,
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

  nativeSelectionCursor: { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
  nativeSelectionElements: [],

  agentSessions: new Map(),
  sessionElements: new Map(),
  abortControllers: new Map(),

  isTouchMode: false,

  theme,

  activationTimestamp: null,
  previouslyFocusedElement: null,

  canUndo: false,
  canRedo: false,
  isAgentConnected: false,
  supportsUndo: false,
  supportsFollowUp: false,
  dismissButtonText: undefined,
});

interface GrabMachineInput {
  theme: Required<Theme>;
  hasAgentProvider: boolean;
  keyHoldDuration: number;
}

type GrabMachineEvent =
  | { type: "HOLD_START"; duration?: number }
  | { type: "RELEASE" }
  | { type: "ACTIVATE" }
  | { type: "DEACTIVATE" }
  | { type: "TOGGLE" }
  | { type: "FREEZE" }
  | { type: "UNFREEZE" }
  | { type: "DRAG_START"; position: Position }
  | { type: "DRAG_END"; position: Position }
  | { type: "CLICK"; position: Position; element: Element }
  | { type: "DOUBLE_CLICK"; position: Position; element: Element }
  | { type: "COPY_START" }
  | { type: "COPY_DONE"; element?: Element }
  | { type: "INPUT_MODE_ENTER"; position: Position; element: Element }
  | { type: "INPUT_MODE_EXIT" }
  | { type: "INPUT_CHANGE"; value: string }
  | { type: "INPUT_SUBMIT" }
  | { type: "INPUT_CANCEL" }
  | { type: "ESC" }
  | { type: "CONFIRM_DISMISS" }
  | { type: "CANCEL_DISMISS" }
  | { type: "MOUSE_MOVE"; position: Position }
  | { type: "ELEMENT_DETECTED"; element: Element | null }
  | { type: "FREEZE_ELEMENT"; element: Element }
  | { type: "SET_TOGGLE_MODE"; value: boolean }
  | { type: "TEXT_SELECTED"; elements: Element[]; cursor: Position }
  | { type: "SELECTION_CLEARED" }
  | {
      type: "SESSION_START";
      sessionId: string;
      session: AgentSession;
      element: Element;
    }
  | { type: "STREAM_STATUS"; sessionId: string; status: string }
  | { type: "STREAM_DONE"; sessionId: string; status?: string }
  | { type: "STREAM_ERROR"; sessionId: string; error: string }
  | { type: "SESSION_ABORT"; sessionId?: string }
  | { type: "SESSION_DISMISS"; sessionId: string }
  | { type: "ERROR_ACKNOWLEDGE"; sessionId: string }
  | { type: "VIEWPORT_CHANGE" }
  | { type: "ADD_GRABBED_BOX"; box: GrabbedBox }
  | { type: "REMOVE_GRABBED_BOX"; boxId: string }
  | { type: "CLEAR_GRABBED_BOXES" }
  | { type: "ADD_LABEL_INSTANCE"; instance: SelectionLabelInstance }
  | {
      type: "UPDATE_LABEL_INSTANCE";
      instanceId: string;
      status: SelectionLabelInstance["status"];
    }
  | { type: "REMOVE_LABEL_INSTANCE"; instanceId: string }
  | { type: "SET_TOUCH_MODE"; value: boolean }
  | {
      type: "SET_SELECTION_SOURCE";
      filePath: string | null;
      lineNumber: number | null;
    }
  | { type: "SET_COPY_START"; position: Position; element: Element }
  | { type: "SET_LAST_GRABBED"; element: Element | null }
  | { type: "SET_LAST_COPIED"; element: Element | null }
  | {
      type: "SET_PENDING_CLICK";
      data: { clientX: number; clientY: number; element: Element } | null;
    }
  | { type: "PENDING_CLICK_TIMEOUT" }
  | { type: "SET_REPLY_SESSION"; sessionId: string | null }
  | { type: "SET_HAS_AGENT_PROVIDER"; value: boolean }
  | { type: "SET_UNDO_REDO_STATE"; canUndo: boolean; canRedo: boolean }
  | {
      type: "SET_AGENT_CAPABILITIES";
      supportsUndo: boolean;
      supportsFollowUp: boolean;
      dismissButtonText: string | undefined;
      isAgentConnected: boolean;
    }
  | { type: "CONFIRM_AGENT_ABORT" }
  | { type: "CANCEL_AGENT_ABORT" }
  | { type: "UPDATE_SESSION_BOUNDS" }
  | { type: "CLEAR_NATIVE_SELECTION" };

type GuardArgs = { context: GrabMachineContext };

const hasAgentProvider = ({ context }: GuardArgs): boolean =>
  context.hasAgentProvider;

const hasElement = ({ context }: GuardArgs): boolean =>
  context.frozenElement !== null || context.detectedElement !== null;

const hasNativeSelection = ({ context }: GuardArgs): boolean =>
  context.nativeSelectionElements.length > 0;

const hasInputText = ({ context }: GuardArgs): boolean =>
  context.inputText.trim().length > 0;

const isToggleMode = ({ context }: GuardArgs): boolean => context.isToggleMode;

const hasPendingClick = ({ context }: GuardArgs): boolean =>
  context.pendingClickData !== null;

const canUndo = ({ context }: GuardArgs): boolean => context.canUndo;

const canRedo = ({ context }: GuardArgs): boolean => context.canRedo;

const hasActiveAgentSessions = ({ context }: GuardArgs): boolean =>
  context.agentSessions.size > 0;

const isAgentStreaming = ({ context }: GuardArgs): boolean =>
  Array.from(context.agentSessions.values()).some(
    (session) => session.isStreaming,
  );

const hasLastCopiedElement = ({ context }: GuardArgs): boolean =>
  context.lastCopiedElement !== null &&
  document.contains(context.lastCopiedElement);

const hasNoActiveConfirmationLabels = ({ context }: GuardArgs): boolean =>
  !context.labelInstances.some(
    (instance) => instance.status === "copied" || instance.status === "fading",
  );

const stateMachine = setup({
  types: {
    context: {} as GrabMachineContext,
    events: {} as GrabMachineEvent,
    input: {} as GrabMachineInput,
  },
  delays: {
    KEY_HOLD_DURATION: ({ context }) => context.keyHoldDuration,
    DOUBLE_CLICK_THRESHOLD: DOUBLE_CLICK_THRESHOLD_MS,
    SUCCESS_LABEL_DURATION: SUCCESS_LABEL_DURATION_MS,
    COPIED_LABEL_DURATION: COPIED_LABEL_DURATION_MS,
  },
  guards: {
    hasAgentProvider,
    hasElement,
    hasNativeSelection,
    hasInputText,
    isToggleMode,
    hasPendingClick,
    isAgentStreaming,
    hasLastCopiedElement,
  },
  actions: {
    setMousePosition: assign({
      mousePosition: ({ event }) => {
        if (event.type === "MOUSE_MOVE") return event.position;
        return { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION };
      },
    }),
    setDetectedElement: assign({
      detectedElement: ({ event }) =>
        event.type === "ELEMENT_DETECTED" ? event.element : null,
    }),
    setFrozenElement: assign({
      frozenElement: ({ event }) =>
        event.type === "FREEZE_ELEMENT" ? event.element : null,
    }),
    clearFrozenElement: assign({ frozenElement: () => null }),
    setDragStart: assign({
      dragStart: ({ event }) => {
        if (event.type === "DRAG_START") {
          return {
            x: event.position.x + window.scrollX,
            y: event.position.y + window.scrollY,
          };
        }
        return { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION };
      },
    }),
    resetDragStart: assign({
      dragStart: () => ({ x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION }),
    }),
    setCopyStart: assign({
      copyStart: ({ event }) => {
        if (event.type === "SET_COPY_START") return event.position;
        return { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION };
      },
      copyOffsetFromCenterX: ({ event }) => {
        if (event.type === "SET_COPY_START" && event.element) {
          const bounds = createElementBounds(event.element);
          const selectionCenterX = bounds.x + bounds.width / 2;
          return event.position.x - selectionCenterX;
        }
        return 0;
      },
    }),
    setInputText: assign({
      inputText: ({ event }) =>
        event.type === "INPUT_CHANGE" ? event.value : "",
    }),
    clearInputText: assign({ inputText: () => "" }),
    enableToggleMode: assign({ isToggleMode: () => true }),
    disableToggleMode: assign({ isToggleMode: () => false }),
    setToggleMode: assign({
      isToggleMode: ({ event }) =>
        event.type === "SET_TOGGLE_MODE" ? event.value : false,
    }),
    setLastGrabbedElement: assign({
      lastGrabbedElement: ({ event }) =>
        event.type === "SET_LAST_GRABBED" ? event.element : null,
    }),
    setLastCopiedElement: assign({
      lastCopiedElement: ({ event }) =>
        event.type === "SET_LAST_COPIED" || event.type === "COPY_DONE"
          ? event.element ?? null
          : null,
    }),
    clearLastCopiedElement: assign({ lastCopiedElement: () => null }),
    incrementViewportVersion: assign({
      viewportVersion: ({ context }) => context.viewportVersion + 1,
    }),
    addGrabbedBox: assign({
      grabbedBoxes: ({ context, event }) =>
        event.type === "ADD_GRABBED_BOX"
          ? [...context.grabbedBoxes, event.box]
          : context.grabbedBoxes,
    }),
    removeGrabbedBox: assign({
      grabbedBoxes: ({ context, event }) =>
        event.type === "REMOVE_GRABBED_BOX"
          ? context.grabbedBoxes.filter((box) => box.id !== event.boxId)
          : context.grabbedBoxes,
    }),
    clearGrabbedBoxes: assign({
      grabbedBoxes: () => [],
    }),
    addLabelInstance: assign({
      labelInstances: ({ context, event }) =>
        event.type === "ADD_LABEL_INSTANCE"
          ? [...context.labelInstances, event.instance]
          : context.labelInstances,
    }),
    updateLabelInstance: assign({
      labelInstances: ({ context, event }) =>
        event.type === "UPDATE_LABEL_INSTANCE"
          ? context.labelInstances.map((instance) =>
              instance.id === event.instanceId
                ? { ...instance, status: event.status }
                : instance,
            )
          : context.labelInstances,
    }),
    removeLabelInstance: assign({
      labelInstances: ({ context, event }) =>
        event.type === "REMOVE_LABEL_INSTANCE"
          ? context.labelInstances.filter((i) => i.id !== event.instanceId)
          : context.labelInstances,
    }),
    clearLabelInstances: assign({ labelInstances: () => [] }),
    setNativeSelectionCursor: assign({
      nativeSelectionCursor: ({ event }) =>
        event.type === "TEXT_SELECTED"
          ? event.cursor
          : { x: OFFSCREEN_POSITION, y: OFFSCREEN_POSITION },
    }),
    setNativeSelectionElements: assign({
      nativeSelectionElements: ({ event }) =>
        event.type === "TEXT_SELECTED" ? event.elements : [],
    }),
    clearNativeSelection: assign({
      nativeSelectionCursor: () => ({
        x: OFFSCREEN_POSITION,
        y: OFFSCREEN_POSITION,
      }),
      nativeSelectionElements: () => [],
    }),
    setTouchMode: assign({
      isTouchMode: ({ event }) =>
        event.type === "SET_TOUCH_MODE" ? event.value : false,
    }),
    setSelectionSource: assign({
      selectionFilePath: ({ event }) =>
        event.type === "SET_SELECTION_SOURCE" ? event.filePath : null,
      selectionLineNumber: ({ event }) =>
        event.type === "SET_SELECTION_SOURCE" ? event.lineNumber : null,
    }),
    clearSelectionSource: assign({
      selectionFilePath: () => null,
      selectionLineNumber: () => null,
    }),
    setPendingClickData: assign({
      pendingClickData: ({ event }) =>
        event.type === "SET_PENDING_CLICK" ? event.data : null,
    }),
    clearPendingClickData: assign({ pendingClickData: () => null }),
    setReplySessionId: assign({
      replySessionId: ({ event }) =>
        event.type === "SET_REPLY_SESSION" ? event.sessionId : null,
    }),
    clearReplySessionId: assign({ replySessionId: () => null }),
    addAgentSession: assign({
      agentSessions: ({ context, event }) => {
        if (event.type !== "SESSION_START") return context.agentSessions;
        const newSessions = new Map(context.agentSessions);
        newSessions.set(event.sessionId, event.session);
        return newSessions;
      },
    }),
    setSessionElement: assign({
      sessionElements: ({ context, event }) => {
        if (event.type !== "SESSION_START") return context.sessionElements;
        const newMap = new Map(context.sessionElements);
        newMap.set(event.sessionId, event.element);
        return newMap;
      },
    }),
    updateAgentSessionStatus: assign({
      agentSessions: ({ context, event }) => {
        if (event.type !== "STREAM_STATUS") return context.agentSessions;
        const session = context.agentSessions.get(event.sessionId);
        if (!session) return context.agentSessions;
        const newSessions = new Map(context.agentSessions);
        newSessions.set(event.sessionId, {
          ...session,
          lastStatus: event.status,
        });
        return newSessions;
      },
    }),
    completeAgentSession: assign({
      agentSessions: ({ context, event }) => {
        if (event.type !== "STREAM_DONE") return context.agentSessions;
        const session = context.agentSessions.get(event.sessionId);
        if (!session) return context.agentSessions;
        const newSessions = new Map(context.agentSessions);
        newSessions.set(event.sessionId, {
          ...session,
          isStreaming: false,
          lastStatus: event.status ?? session.lastStatus,
        });
        return newSessions;
      },
    }),
    setAgentSessionError: assign({
      agentSessions: ({ context, event }) => {
        if (event.type !== "STREAM_ERROR") return context.agentSessions;
        const session = context.agentSessions.get(event.sessionId);
        if (!session) return context.agentSessions;
        const newSessions = new Map(context.agentSessions);
        newSessions.set(event.sessionId, {
          ...session,
          isStreaming: false,
          error: event.error,
        });
        return newSessions;
      },
    }),
    removeAgentSession: assign({
      agentSessions: ({ context, event }) => {
        if (
          event.type !== "SESSION_DISMISS" &&
          event.type !== "ERROR_ACKNOWLEDGE"
        )
          return context.agentSessions;
        const newSessions = new Map(context.agentSessions);
        newSessions.delete(event.sessionId);
        return newSessions;
      },
      sessionElements: ({ context, event }) => {
        if (
          event.type !== "SESSION_DISMISS" &&
          event.type !== "ERROR_ACKNOWLEDGE"
        )
          return context.sessionElements;
        const newMap = new Map(context.sessionElements);
        newMap.delete(event.sessionId);
        return newMap;
      },
    }),
    storeActivationTimestamp: assign({
      activationTimestamp: () => Date.now(),
      previouslyFocusedElement: () => document.activeElement,
    }),
    clearActivationTimestamp: assign({
      activationTimestamp: () => null,
      previouslyFocusedElement: () => null,
    }),
    setKeyHoldDuration: assign({
      keyHoldDuration: ({ event, context }) =>
        event.type === "HOLD_START" && event.duration !== undefined
          ? event.duration
          : context.keyHoldDuration,
    }),
    setHasAgentProvider: assign({
      hasAgentProvider: ({ event }) =>
        event.type === "SET_HAS_AGENT_PROVIDER" ? event.value : false,
    }),
    setUndoRedoState: assign({
      canUndo: ({ event }) =>
        event.type === "SET_UNDO_REDO_STATE" ? event.canUndo : false,
      canRedo: ({ event }) =>
        event.type === "SET_UNDO_REDO_STATE" ? event.canRedo : false,
    }),
    setAgentCapabilities: assign({
      supportsUndo: ({ event }) =>
        event.type === "SET_AGENT_CAPABILITIES" ? event.supportsUndo : false,
      supportsFollowUp: ({ event }) =>
        event.type === "SET_AGENT_CAPABILITIES"
          ? event.supportsFollowUp
          : false,
      dismissButtonText: ({ event }) =>
        event.type === "SET_AGENT_CAPABILITIES"
          ? event.dismissButtonText
          : undefined,
      isAgentConnected: ({ event }) =>
        event.type === "SET_AGENT_CAPABILITIES"
          ? event.isAgentConnected
          : false,
    }),
    resetActivationState: assign({
      isToggleMode: () => false,
      inputText: () => "",
      frozenElement: () => null,
      pendingClickData: () => null,
      activationTimestamp: () => null,
    }),
    updateSessionBounds: assign({
      agentSessions: ({ context }) => {
        if (context.agentSessions.size === 0) return context.agentSessions;
        const updatedSessions = new Map(context.agentSessions);
        let didUpdate = false;
        for (const [sessionId, session] of context.agentSessions) {
          const element = context.sessionElements.get(sessionId);
          if (element && document.contains(element)) {
            const newBounds = createElementBounds(element);
            const oldBounds = session.selectionBounds;
            let updatedPosition = session.position;
            if (oldBounds) {
              const oldCenterX = oldBounds.x + oldBounds.width / 2;
              const offsetX = session.position.x - oldCenterX;
              const newCenterX = newBounds.x + newBounds.width / 2;
              updatedPosition = {
                ...session.position,
                x: newCenterX + offsetX,
              };
            }
            updatedSessions.set(sessionId, {
              ...session,
              selectionBounds: newBounds,
              position: updatedPosition,
            });
            didUpdate = true;
          }
        }
        return didUpdate ? updatedSessions : context.agentSessions;
      },
    }),
    freezeCurrentElement: assign({
      frozenElement: ({ context }) =>
        context.frozenElement ?? context.detectedElement,
    }),
    saveInputModePosition: assign({
      copyStart: ({ event, context }) => {
        if (event.type === "INPUT_MODE_ENTER") return event.position;
        return context.copyStart;
      },
      copyOffsetFromCenterX: ({ event }) => {
        if (event.type === "INPUT_MODE_ENTER" && event.element) {
          const bounds = createElementBounds(event.element);
          const selectionCenterX = bounds.x + bounds.width / 2;
          return event.position.x - selectionCenterX;
        }
        return 0;
      },
      mousePosition: ({ event, context }) => {
        if (event.type === "INPUT_MODE_ENTER") return event.position;
        return context.mousePosition;
      },
      frozenElement: ({ event, context }) => {
        if (event.type === "INPUT_MODE_ENTER") return event.element;
        return context.frozenElement;
      },
    }),
  },
}).createMachine({
  id: "grabMachine",
  type: "parallel",
  context: ({ input }) => ({
    ...createInitialContext(input.theme),
    hasAgentProvider: input.hasAgentProvider,
    keyHoldDuration: input.keyHoldDuration,
  }),
  states: {
    activation: {
      initial: "idle",
      states: {
        idle: {
          on: {
            HOLD_START: {
              target: "holding",
              actions: ["setKeyHoldDuration"],
            },
            ACTIVATE: {
              target: "active",
              actions: ["enableToggleMode", "storeActivationTimestamp"],
            },
          },
        },
        holding: {
          after: {
            KEY_HOLD_DURATION: {
              target: "active",
              actions: ["storeActivationTimestamp"],
            },
          },
          on: {
            RELEASE: { target: "idle" },
            ACTIVATE: {
              target: "active",
              actions: ["enableToggleMode", "storeActivationTimestamp"],
            },
          },
        },
        active: {
          initial: "hovering",
          states: {
            hovering: {
              on: {
                FREEZE: {
                  target: "frozen",
                  actions: ["freezeCurrentElement"],
                },
                DRAG_START: {
                  target: "dragging",
                  actions: ["setDragStart"],
                },
              },
            },
            frozen: {
              on: {
                UNFREEZE: {
                  target: "hovering",
                  actions: ["clearFrozenElement"],
                },
                DRAG_START: {
                  target: "dragging",
                  actions: ["setDragStart"],
                },
              },
            },
            dragging: {
              on: {
                DRAG_END: {
                  target: "justDragged",
                  actions: ["resetDragStart"],
                },
              },
            },
            justDragged: {
              on: {
                DRAG_START: { target: "dragging", actions: ["setDragStart"] },
              },
              after: {
                SUCCESS_LABEL_DURATION: { target: "hovering" },
              },
            },
          },
          on: {
            DEACTIVATE: {
              target: "idle",
              actions: ["resetActivationState", "clearActivationTimestamp"],
            },
            MOUSE_MOVE: { actions: ["setMousePosition"] },
            ELEMENT_DETECTED: { actions: ["setDetectedElement"] },
            SET_TOUCH_MODE: { actions: ["setTouchMode"] },
            SET_SELECTION_SOURCE: { actions: ["setSelectionSource"] },
          },
        },
      },
      on: {
        TOGGLE: [
          {
            guard: ({ context }) => context.activationTimestamp !== null,
            target: ".idle",
            actions: ["resetActivationState", "clearActivationTimestamp"],
          },
          {
            target: ".active",
            actions: ["enableToggleMode", "storeActivationTimestamp"],
          },
        ],
        VIEWPORT_CHANGE: {
          actions: ["incrementViewportVersion", "updateSessionBounds"],
        },
        ADD_GRABBED_BOX: { actions: ["addGrabbedBox"] },
        REMOVE_GRABBED_BOX: { actions: ["removeGrabbedBox"] },
        CLEAR_GRABBED_BOXES: { actions: ["clearGrabbedBoxes"] },
        SET_LAST_GRABBED: { actions: ["setLastGrabbedElement"] },
        SET_LAST_COPIED: { actions: ["setLastCopiedElement"] },
        SET_HAS_AGENT_PROVIDER: { actions: ["setHasAgentProvider"] },
        SET_UNDO_REDO_STATE: { actions: ["setUndoRedoState"] },
        SET_AGENT_CAPABILITIES: { actions: ["setAgentCapabilities"] },
        SET_TOGGLE_MODE: { actions: ["setToggleMode"] },
        FREEZE_ELEMENT: { actions: ["setFrozenElement"] },
      },
    },

    interaction: {
      initial: "idle",
      states: {
        idle: {
          on: {
            CLICK: {
              target: "awaitingDoubleClick",
              actions: ["setPendingClickData"],
            },
            INPUT_MODE_ENTER: {
              target: "inputMode",
              actions: ["saveInputModePosition", "enableToggleMode"],
            },
            COPY_START: {
              target: "copying",
            },
          },
        },
        awaitingDoubleClick: {
          after: {
            DOUBLE_CLICK_THRESHOLD: {
              target: "copying",
            },
          },
          on: {
            DOUBLE_CLICK: {
              target: "inputMode",
              guard: "hasAgentProvider",
              actions: ["clearPendingClickData", "saveInputModePosition"],
            },
            CLICK: {
              target: "inputMode",
              guard: "hasAgentProvider",
              actions: ["clearPendingClickData", "saveInputModePosition"],
            },
          },
        },
        copying: {
          on: {
            COPY_DONE: {
              target: "justCopied",
              actions: ["clearPendingClickData", "setLastCopiedElement"],
            },
          },
        },
        justCopied: {
          after: {
            COPIED_LABEL_DURATION: { target: "idle" },
          },
        },
        inputMode: {
          initial: "typing",
          states: {
            typing: {
              on: {
                ESC: [
                  {
                    target: "confirmingDismiss",
                    guard: "hasInputText",
                  },
                  {
                    target: "#grabMachine.interaction.idle",
                  },
                ],
                INPUT_SUBMIT: {
                  target: "#grabMachine.interaction.copying",
                },
              },
            },
            confirmingDismiss: {
              on: {
                CANCEL_DISMISS: { target: "typing" },
                CONFIRM_DISMISS: {
                  target: "#grabMachine.interaction.idle",
                  actions: ["clearInputText", "clearReplySessionId"],
                },
              },
            },
          },
          on: {
            INPUT_CHANGE: { actions: ["setInputText"] },
            INPUT_CANCEL: {
              target: "idle",
              actions: ["clearInputText", "clearReplySessionId"],
            },
          },
        },
      },
      on: {
        ADD_LABEL_INSTANCE: { actions: ["addLabelInstance"] },
        UPDATE_LABEL_INSTANCE: { actions: ["updateLabelInstance"] },
        REMOVE_LABEL_INSTANCE: { actions: ["removeLabelInstance"] },
        SET_COPY_START: { actions: ["setCopyStart"] },
        SET_PENDING_CLICK: { actions: ["setPendingClickData"] },
        SET_REPLY_SESSION: { actions: ["setReplySessionId"] },
        DEACTIVATE: {
          target: ".idle",
          actions: ["clearInputText", "clearReplySessionId", "clearPendingClickData"],
        },
      },
    },

    nativeSelection: {
      initial: "inactive",
      states: {
        inactive: {
          on: {
            TEXT_SELECTED: {
              target: "active",
              actions: [
                "setNativeSelectionCursor",
                "setNativeSelectionElements",
              ],
            },
          },
        },
        active: {
          on: {
            SELECTION_CLEARED: {
              target: "inactive",
              actions: ["clearNativeSelection"],
            },
            CLEAR_NATIVE_SELECTION: {
              target: "inactive",
              actions: ["clearNativeSelection"],
            },
            TEXT_SELECTED: {
              actions: [
                "setNativeSelectionCursor",
                "setNativeSelectionElements",
              ],
            },
          },
        },
      },
    },

    agentSessions: {
      initial: "idle",
      states: {
        idle: {
          on: {
            SESSION_START: {
              target: "streaming",
              actions: ["addAgentSession", "setSessionElement"],
            },
          },
        },
        streaming: {
          on: {
            STREAM_STATUS: {
              actions: ["updateAgentSessionStatus"],
            },
            STREAM_DONE: {
              target: "completed",
              actions: ["completeAgentSession"],
            },
            STREAM_ERROR: {
              target: "error",
              actions: ["setAgentSessionError"],
            },
            SESSION_ABORT: {
              target: "idle",
              actions: ["removeAgentSession"],
            },
          },
        },
        completed: {
          on: {
            SESSION_DISMISS: {
              target: "idle",
              actions: ["removeAgentSession"],
            },
            SESSION_START: {
              target: "streaming",
              actions: ["addAgentSession", "setSessionElement"],
            },
          },
        },
        error: {
          on: {
            ERROR_ACKNOWLEDGE: {
              target: "idle",
              actions: ["removeAgentSession"],
            },
            SESSION_START: {
              target: "streaming",
              actions: ["addAgentSession", "setSessionElement"],
            },
          },
        },
      },
      on: {
        UPDATE_SESSION_BOUNDS: { actions: ["updateSessionBounds"] },
      },
    },

    agentAbortConfirmation: {
      initial: "inactive",
      states: {
        inactive: {
          on: {
            ESC: {
              target: "confirming",
              guard: "isAgentStreaming",
            },
          },
        },
        confirming: {
          on: {
            CONFIRM_AGENT_ABORT: {
              target: "inactive",
            },
            CANCEL_AGENT_ABORT: {
              target: "inactive",
            },
          },
        },
      },
    },
  },
});

export { stateMachine, createInitialContext };
export {
  hasAgentProvider,
  hasElement,
  hasNativeSelection,
  hasInputText,
  isToggleMode,
  hasPendingClick,
  canUndo,
  canRedo,
  hasActiveAgentSessions,
  isAgentStreaming,
  hasLastCopiedElement,
  hasNoActiveConfirmationLabels,
};
export type {
  GrabMachineContext,
  GrabMachineEvent,
  GrabMachineInput,
  PendingClickData,
};
