import { createStore } from "solid-js/store";
import type {
  Plugin,
  PluginConfig,
  PluginHooks,
  Theme,
  PluginAction,
  ContextMenuAction,
  ToolbarMenuAction,
  ReactGrabAPI,
  ReactGrabState,
  PromptModeContext,
  OverlayBounds,
  DragRect,
  ElementLabelVariant,
  ElementLabelContext,
  CrosshairContext,
  ActivationMode,
  ActivationKey,
  SettableOptions,
  AgentContext,
  ActionContext,
} from "../types.js";
import { DEFAULT_THEME, deepMergeTheme } from "./theme.js";
import { DEFAULT_KEY_HOLD_DURATION_MS } from "../constants.js";

interface RegisteredPlugin {
  plugin: Plugin;
  config: PluginConfig;
}

interface OptionsState {
  activationMode: ActivationMode;
  keyHoldDuration: number;
  allowActivationInsideInput: boolean;
  maxContextLines: number;
  activationKey: ActivationKey | undefined;
  getContent: ((elements: Element[]) => Promise<string> | string) | undefined;
  freezeReactUpdates: boolean;
}

const DEFAULT_OPTIONS: OptionsState = {
  activationMode: "toggle",
  keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
  allowActivationInsideInput: true,
  maxContextLines: 3,
  activationKey: undefined,
  getContent: undefined,
  freezeReactUpdates: true,
};

interface PluginStoreState {
  theme: Required<Theme>;
  options: OptionsState;
  actions: ContextMenuAction[];
  toolbarActions: ToolbarMenuAction[];
}

type HookName = keyof PluginHooks;

const createPluginRegistry = (initialOptions: SettableOptions = {}) => {
  const plugins = new Map<string, RegisteredPlugin>();
  const directOptionOverrides: Partial<OptionsState> = {};

  const [store, setStore] = createStore<PluginStoreState>({
    theme: DEFAULT_THEME,
    options: { ...DEFAULT_OPTIONS, ...initialOptions },
    actions: [],
    toolbarActions: [],
  });

  const isToolbarAction = (action: PluginAction): action is ToolbarMenuAction =>
    action.target === "toolbar";

  const recomputeStore = () => {
    let mergedTheme: Required<Theme> = DEFAULT_THEME;
    let mergedOptions: OptionsState = { ...DEFAULT_OPTIONS, ...initialOptions };
    const allContextMenuActions: ContextMenuAction[] = [];
    const allToolbarActions: ToolbarMenuAction[] = [];

    for (const { config } of plugins.values()) {
      if (config.theme) {
        mergedTheme = deepMergeTheme(mergedTheme, config.theme);
      }

      if (config.options) {
        mergedOptions = { ...mergedOptions, ...config.options };
      }

      if (config.actions) {
        for (const action of config.actions) {
          if (isToolbarAction(action)) {
            const originalOnAction = action.onAction;
            allToolbarActions.push({
              ...action,
              onAction: () => {
                callHook("cancelPendingToolbarActions");
                originalOnAction();
              },
            });
          } else {
            allContextMenuActions.push(action);
          }
        }
      }
    }

    mergedOptions = { ...mergedOptions, ...directOptionOverrides };

    setStore("theme", mergedTheme);
    setStore("options", mergedOptions);
    setStore("actions", allContextMenuActions);
    setStore("toolbarActions", allToolbarActions);
  };

  const setOptions = (optionUpdates: SettableOptions) => {
    for (const [optionKey, optionValue] of Object.entries(optionUpdates)) {
      if (optionValue === undefined) continue;
      (directOptionOverrides as Record<string, unknown>)[optionKey] =
        optionValue;
      setStore(
        "options",
        optionKey as keyof OptionsState,
        optionValue as OptionsState[keyof OptionsState],
      );
    }
  };

  const register = (plugin: Plugin, api: ReactGrabAPI) => {
    if (plugins.has(plugin.name)) {
      unregister(plugin.name);
    }

    const config: PluginConfig = plugin.setup?.(api, hooks) ?? {};

    if (plugin.theme) {
      config.theme = config.theme
        ? deepMergeTheme(
            deepMergeTheme(DEFAULT_THEME, plugin.theme),
            config.theme,
          )
        : plugin.theme;
    }

    if (plugin.actions) {
      config.actions = [...plugin.actions, ...(config.actions ?? [])];
    }

    if (plugin.hooks) {
      config.hooks = config.hooks
        ? { ...plugin.hooks, ...config.hooks }
        : plugin.hooks;
    }

    if (plugin.options) {
      config.options = config.options
        ? { ...plugin.options, ...config.options }
        : plugin.options;
    }

    plugins.set(plugin.name, { plugin, config });
    recomputeStore();
    return config;
  };

  const unregister = (name: string) => {
    const registered = plugins.get(name);
    if (!registered) return;

    if (registered.config.cleanup) {
      registered.config.cleanup();
    }

    plugins.delete(name);
    recomputeStore();
  };

  const getPluginNames = (): string[] => {
    return Array.from(plugins.keys());
  };

  const callHook = <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): void => {
    for (const { config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((...hookArgs: Parameters<NonNullable<PluginHooks[K]>>) => void)
        | undefined;
      if (hook) {
        hook(...args);
      }
    }
  };

  const callHookWithHandled = <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): boolean => {
    let handled = false;
    for (const { config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((
            ...hookArgs: Parameters<NonNullable<PluginHooks[K]>>
          ) => boolean | void)
        | undefined;
      if (hook) {
        const result = hook(...args);
        if (result === true) {
          handled = true;
        }
      }
    }
    return handled;
  };

  const callHookAsync = async <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> => {
    for (const { config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((
            ...hookArgs: Parameters<NonNullable<PluginHooks[K]>>
          ) => ReturnType<NonNullable<PluginHooks[K]>>)
        | undefined;
      if (hook) {
        await hook(...args);
      }
    }
  };

  const callHookReduce = async <T>(
    hookName: HookName,
    initialValue: T,
    ...extraArgs: unknown[]
  ): Promise<T> => {
    let result = initialValue;
    for (const { config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((value: T, ...hookArgs: unknown[]) => T | Promise<T>)
        | undefined;
      if (hook) {
        result = await hook(result, ...extraArgs);
      }
    }
    return result;
  };

  const callHookReduceSync = <T>(
    hookName: HookName,
    initialValue: T,
    ...extraArgs: unknown[]
  ): T => {
    let result = initialValue;
    for (const { config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((value: T, ...hookArgs: unknown[]) => T)
        | undefined;
      if (hook) {
        result = hook(result, ...extraArgs);
      }
    }
    return result;
  };

  const hooks = {
    onActivate: () => callHook("onActivate"),
    onDeactivate: () => callHook("onDeactivate"),
    onElementHover: (element: Element) => callHook("onElementHover", element),
    onElementSelect: (
      element: Element,
    ): { wasIntercepted: boolean; pendingResult?: Promise<boolean> } => {
      let wasIntercepted = false;
      let pendingResult: Promise<boolean> | undefined;
      for (const { config } of plugins.values()) {
        const hook = config.hooks?.onElementSelect;
        if (hook) {
          const result = hook(element);
          if (result === true) {
            wasIntercepted = true;
          } else if (result instanceof Promise) {
            wasIntercepted = true;
            pendingResult = result;
          }
        }
      }
      return { wasIntercepted, pendingResult };
    },
    onDragStart: (startX: number, startY: number) =>
      callHook("onDragStart", startX, startY),
    onDragEnd: (elements: Element[], bounds: DragRect) =>
      callHook("onDragEnd", elements, bounds),
    onBeforeCopy: async (elements: Element[]) =>
      callHookAsync("onBeforeCopy", elements),
    transformCopyContent: async (content: string, elements: Element[]) =>
      callHookReduce("transformCopyContent", content, elements),
    onAfterCopy: (elements: Element[], success: boolean) =>
      callHook("onAfterCopy", elements, success),
    onCopySuccess: (elements: Element[], content: string) =>
      callHook("onCopySuccess", elements, content),
    onCopyError: (error: Error) => callHook("onCopyError", error),
    onStateChange: (state: ReactGrabState) => callHook("onStateChange", state),
    onPromptModeChange: (isPromptMode: boolean, context: PromptModeContext) =>
      callHook("onPromptModeChange", isPromptMode, context),
    onSelectionBox: (
      visible: boolean,
      bounds: OverlayBounds | null,
      element: Element | null,
    ) => callHook("onSelectionBox", visible, bounds, element),
    onDragBox: (visible: boolean, bounds: OverlayBounds | null) =>
      callHook("onDragBox", visible, bounds),
    onGrabbedBox: (bounds: OverlayBounds, element: Element) =>
      callHook("onGrabbedBox", bounds, element),
    onElementLabel: (
      visible: boolean,
      variant: ElementLabelVariant,
      context: ElementLabelContext,
    ) => callHook("onElementLabel", visible, variant, context),
    onCrosshair: (visible: boolean, context: CrosshairContext) =>
      callHook("onCrosshair", visible, context),
    onContextMenu: (element: Element, position: { x: number; y: number }) =>
      callHook("onContextMenu", element, position),
    cancelPendingToolbarActions: () => callHook("cancelPendingToolbarActions"),
    onOpenFile: (filePath: string, lineNumber?: number) =>
      callHookWithHandled("onOpenFile", filePath, lineNumber),
    transformHtmlContent: async (html: string, elements: Element[]) =>
      callHookReduce("transformHtmlContent", html, elements),
    transformAgentContext: async (context: AgentContext, elements: Element[]) =>
      callHookReduce("transformAgentContext", context, elements),
    transformActionContext: (context: ActionContext) =>
      callHookReduceSync("transformActionContext", context),
    transformOpenFileUrl: (
      url: string,
      filePath: string,
      lineNumber?: number,
    ) => callHookReduceSync("transformOpenFileUrl", url, filePath, lineNumber),
    transformSnippet: async (snippet: string, element: Element) =>
      callHookReduce("transformSnippet", snippet, element),
  };

  return {
    register,
    unregister,
    getPluginNames,
    setOptions,
    store,
    hooks,
  };
};

export { createPluginRegistry };
