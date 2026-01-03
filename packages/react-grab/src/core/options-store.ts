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
  Theme,
  DeepPartial,
} from "../types.js";
import { DEFAULT_KEY_HOLD_DURATION_MS } from "../constants.js";
import { deepMergeTheme } from "./theme.js";

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
  theme: Required<Theme>;
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

const isCallbackKey = (key: string): boolean => key.startsWith("on");

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
  theme: Required<Theme>;
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

const createOptionsStore = (initialOptions: OptionsStoreInput) => {
  const [optionsState, setOptionsState] = createStore<OptionsStoreState>({
    activationMode: initialOptions.activationMode ?? "toggle",
    keyHoldDuration: initialOptions.keyHoldDuration ?? DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: initialOptions.allowActivationInsideInput ?? true,
    maxContextLines: initialOptions.maxContextLines ?? 3,
    activationShortcut: initialOptions.activationShortcut,
    activationKey: initialOptions.activationKey,
    getContent: initialOptions.getContent,
    contextMenuActions: initialOptions.contextMenuActions ?? [],
    agent: initialOptions.agent,
    theme: initialOptions.theme,
  });

  // HACK: store callbacks in a regular object to avoid SolidJS store proxy issues with functions
  const callbackHandlers = Object.fromEntries(
    Object.entries(initialOptions).filter(([optionKey]) => isCallbackKey(optionKey)),
  ) as CallbacksState;

  const setOptions = (optionUpdates: Partial<Omit<OptionsStoreInput, "theme" | "agent">> & { theme?: DeepPartial<Theme>; agent?: Partial<AgentOptions> }) => {
    if (optionUpdates.theme) setOptionsState("theme", deepMergeTheme(optionsState.theme, optionUpdates.theme));
    if (optionUpdates.agent) setOptionsState("agent", { ...optionsState.agent, ...optionUpdates.agent });

    for (const [optionKey, optionValue] of Object.entries(optionUpdates)) {
      if (optionKey === "theme" || optionKey === "agent" || optionValue === undefined) continue;

      if (isCallbackKey(optionKey)) {
        Object.assign(callbackHandlers, { [optionKey]: optionValue });
      } else {
        setOptionsState(optionKey as keyof OptionsStoreState, optionValue as OptionsStoreState[keyof OptionsStoreState]);
      }
    }
  };

  return {
    store: optionsState,
    callbacks: callbackHandlers,
    setStore: setOptionsState,
    setOptions,
  };
};

export { createOptionsStore };
export type { OptionsStoreState, OptionsStoreInput, CallbacksState };
