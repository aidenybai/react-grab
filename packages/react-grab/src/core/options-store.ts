import { createStore } from "solid-js/store";
import type {
  ActivationMode,
  ActivationKey,
  AgentOptions,
  ReactGrabState,
  OverlayBounds,
  ElementLabelVariant,
  PromptModeContext,
  CrosshairContext,
  ElementLabelContext,
  DragRect,
  ContextMenuAction,
} from "../types.js";
import { DEFAULT_KEY_HOLD_DURATION_MS } from "../constants.js";

interface OptionsStoreState {
  activationMode: ActivationMode;
  keyHoldDuration: number;
  allowActivationInsideInput: boolean;
  maxContextLines: number;
  activationShortcut: ((event: KeyboardEvent) => boolean) | undefined;
  activationKey: ActivationKey | undefined;
  getContent: ((elements: Element[]) => Promise<string> | string) | undefined;
  contextMenuActions: ContextMenuAction[];
  agent: AgentOptions | undefined;
}

interface CallbacksState {
  onActivate: (() => void) | undefined;
  onDeactivate: (() => void) | undefined;
  onElementHover: ((element: Element) => void) | undefined;
  onElementSelect: ((element: Element) => void) | undefined;
  onDragStart: ((startX: number, startY: number) => void) | undefined;
  onDragEnd: ((elements: Element[], bounds: DragRect) => void) | undefined;
  onBeforeCopy: ((elements: Element[]) => void | Promise<void>) | undefined;
  onAfterCopy: ((elements: Element[], success: boolean) => void) | undefined;
  onCopySuccess: ((elements: Element[], content: string) => void) | undefined;
  onCopyError: ((error: Error) => void) | undefined;
  onStateChange: ((state: ReactGrabState) => void) | undefined;
  onPromptModeChange:
    | ((isPromptMode: boolean, context: PromptModeContext) => void)
    | undefined;
  onSelectionBox:
    | ((
        visible: boolean,
        bounds: OverlayBounds | null,
        element: Element | null,
      ) => void)
    | undefined;
  onDragBox:
    | ((visible: boolean, bounds: OverlayBounds | null) => void)
    | undefined;
  onGrabbedBox:
    | ((bounds: OverlayBounds, element: Element) => void)
    | undefined;
  onElementLabel:
    | ((
        visible: boolean,
        variant: ElementLabelVariant,
        context: ElementLabelContext,
      ) => void)
    | undefined;
  onCrosshair:
    | ((visible: boolean, context: CrosshairContext) => void)
    | undefined;
  onContextMenu:
    | ((element: Element, position: { x: number; y: number }) => void)
    | undefined;
  onOpenFile: ((filePath: string, lineNumber?: number) => void) | undefined;
}

interface OptionsStoreInput {
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  activationShortcut?: (event: KeyboardEvent) => boolean;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
  contextMenuActions?: ContextMenuAction[];
  agent?: AgentOptions;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementHover?: (element: Element) => void;
  onElementSelect?: (element: Element) => void;
  onDragStart?: (startX: number, startY: number) => void;
  onDragEnd?: (elements: Element[], bounds: DragRect) => void;
  onBeforeCopy?: (elements: Element[]) => void | Promise<void>;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onCopyError?: (error: Error) => void;
  onStateChange?: (state: ReactGrabState) => void;
  onPromptModeChange?: (
    isPromptMode: boolean,
    context: PromptModeContext,
  ) => void;
  onSelectionBox?: (
    visible: boolean,
    bounds: OverlayBounds | null,
    element: Element | null,
  ) => void;
  onDragBox?: (visible: boolean, bounds: OverlayBounds | null) => void;
  onGrabbedBox?: (bounds: OverlayBounds, element: Element) => void;
  onElementLabel?: (
    visible: boolean,
    variant: ElementLabelVariant,
    context: ElementLabelContext,
  ) => void;
  onCrosshair?: (visible: boolean, context: CrosshairContext) => void;
  onContextMenu?: (
    element: Element,
    position: { x: number; y: number },
  ) => void;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
}

type SettableKeys = keyof OptionsStoreState | keyof CallbacksState;

const createOptionsStore = (input: OptionsStoreInput) => {
  const [store, setStore] = createStore<OptionsStoreState>({
    activationMode: input.activationMode ?? "toggle",
    keyHoldDuration: input.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: input.allowActivationInsideInput ?? true,
    maxContextLines: input.maxContextLines ?? 3,
    activationShortcut: input.activationShortcut,
    activationKey: input.activationKey,
    getContent: input.getContent,
    contextMenuActions: input.contextMenuActions ?? [],
    agent: input.agent,
  });

  // HACK: Store callbacks in a regular object to avoid SolidJS store proxy issues with functions
  const callbacks: CallbacksState = {
    onActivate: input.onActivate,
    onDeactivate: input.onDeactivate,
    onElementHover: input.onElementHover,
    onElementSelect: input.onElementSelect,
    onDragStart: input.onDragStart,
    onDragEnd: input.onDragEnd,
    onBeforeCopy: input.onBeforeCopy,
    onAfterCopy: input.onAfterCopy,
    onCopySuccess: input.onCopySuccess,
    onCopyError: input.onCopyError,
    onStateChange: input.onStateChange,
    onPromptModeChange: input.onPromptModeChange,
    onSelectionBox: input.onSelectionBox,
    onDragBox: input.onDragBox,
    onGrabbedBox: input.onGrabbedBox,
    onElementLabel: input.onElementLabel,
    onCrosshair: input.onCrosshair,
    onContextMenu: input.onContextMenu,
    onOpenFile: input.onOpenFile,
  };

  const callbackKeys = new Set<string>(Object.keys(callbacks));

  const setOptions = (partial: Partial<OptionsStoreInput>) => {
    for (const key of Object.keys(partial) as SettableKeys[]) {
      if (partial[key] !== undefined) {
        if (callbackKeys.has(key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (callbacks as any)[key] = partial[key];
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setStore(key as keyof OptionsStoreState, partial[key] as any);
        }
      }
    }
  };

  const registerContextMenuAction = (action: ContextMenuAction) => {
    setStore("contextMenuActions", (actions) => {
      const existingIndex = actions.findIndex((a) => a.id === action.id);
      if (existingIndex !== -1) {
        const updated = [...actions];
        updated[existingIndex] = action;
        return updated;
      }
      return [...actions, action];
    });
  };

  const unregisterContextMenuAction = (actionId: string) => {
    setStore("contextMenuActions", (actions) =>
      actions.filter((a) => a.id !== actionId),
    );
  };

  return {
    store,
    callbacks,
    setStore,
    setOptions,
    registerContextMenuAction,
    unregisterContextMenuAction,
  };
};

export { createOptionsStore };
export type { OptionsStoreState, OptionsStoreInput, CallbacksState };
