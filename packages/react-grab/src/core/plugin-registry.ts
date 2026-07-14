import { getOwner, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import type {
  Position,
  Plugin,
  PluginConfig,
  PluginHooks,
  Theme,
  ContextMenuAction,
  ReactGrabAPI,
  ReactGrabState,
  PromptModeContext,
  OverlayBounds,
  DragRect,
  ElementLabelVariant,
  ElementLabelContext,
  ActivationMode,
  ActivationKey,
  SettableOptions,
  AgentContext,
  ActionContext,
} from "../types.js";
import { DEFAULT_THEME, deepMergeTheme } from "./theme.js";
import { DEFAULT_KEY_HOLD_DURATION_MS, DEFAULT_MAX_CONTEXT_LINES } from "../constants.js";
import { PluginCleanupError, PluginHookError, PluginSetupError } from "../errors.js";
import { reportRecoverableError } from "../utils/report-recoverable-error.js";

interface RegisteredPlugin {
  plugin: Plugin;
  config: PluginConfig;
}

interface OptionsState {
  activationMode: ActivationMode;
  keyHoldDuration: number;
  allowActivationInsideInput: boolean;
  activationKey: ActivationKey | undefined;
  getContent: ((elements: Element[]) => Promise<string> | string) | undefined;
  maxContextLines: number;
  freezeReactUpdates: boolean;
}

const DEFAULT_OPTIONS: OptionsState = {
  activationMode: "toggle",
  keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
  allowActivationInsideInput: true,
  activationKey: undefined,
  getContent: undefined,
  maxContextLines: DEFAULT_MAX_CONTEXT_LINES,
  freezeReactUpdates: true,
};

interface PluginStoreState {
  theme: Required<Theme>;
  options: OptionsState;
  actions: ContextMenuAction[];
}

type HookName = keyof PluginHooks;

const createPluginRegistry = (initialOptions: SettableOptions = {}) => {
  const plugins = new Map<string, RegisteredPlugin>();
  const directOptionOverrides: Partial<OptionsState> = {};
  let isDisposed = false;

  const [store, setStore] = createStore<PluginStoreState>({
    theme: DEFAULT_THEME,
    options: { ...DEFAULT_OPTIONS, ...initialOptions },
    actions: [],
  });

  const createPluginStoreState = (
    registeredPlugins: Iterable<RegisteredPlugin>,
  ): PluginStoreState => {
    let mergedTheme: Required<Theme> = DEFAULT_THEME;
    let mergedOptions: OptionsState = { ...DEFAULT_OPTIONS, ...initialOptions };
    const allContextMenuActions: ContextMenuAction[] = [];

    for (const { config } of registeredPlugins) {
      if (config.theme) {
        mergedTheme = deepMergeTheme(mergedTheme, config.theme);
      }

      if (config.options) {
        mergedOptions = { ...mergedOptions, ...config.options };
      }

      if (config.actions) {
        for (const action of config.actions) {
          allContextMenuActions.push(action);
        }
      }
    }

    return {
      theme: mergedTheme,
      options: mergedOptions,
      actions: allContextMenuActions,
    };
  };

  const applyPluginStoreState = (nextStore: PluginStoreState): void => {
    setStore("theme", nextStore.theme);
    setStore("options", { ...nextStore.options, ...directOptionOverrides });
    setStore("actions", nextStore.actions);
  };

  const recomputeStore = () => {
    applyPluginStoreState(createPluginStoreState(plugins.values()));
  };

  const setOption = <OptionKey extends keyof OptionsState>(
    optionKey: OptionKey,
    optionValue: OptionsState[OptionKey],
  ) => {
    directOptionOverrides[optionKey] = optionValue;
    setStore("options", optionKey, () => optionValue);
  };

  const SETTABLE_OPTION_KEYS: Array<keyof OptionsState> = [
    "activationMode",
    "keyHoldDuration",
    "allowActivationInsideInput",
    "activationKey",
    "getContent",
    "maxContextLines",
    "freezeReactUpdates",
  ];

  const setOptions = (optionUpdates: SettableOptions) => {
    if (isDisposed) return;
    for (const optionKey of SETTABLE_OPTION_KEYS) {
      if (optionUpdates[optionKey] !== undefined) {
        setOption(optionKey, optionUpdates[optionKey]!);
      }
    }
  };

  const cleanupPlugin = ({ plugin, config }: RegisteredPlugin) => {
    try {
      const cleanupResult = config.cleanup?.();
      void Promise.resolve(cleanupResult).catch((error) => {
        reportRecoverableError(new PluginCleanupError(plugin.name, error));
      });
    } catch (error) {
      reportRecoverableError(new PluginCleanupError(plugin.name, error));
    }
  };

  const preparePluginConfig = (plugin: Plugin, api: ReactGrabAPI): PluginConfig => {
    let setupConfig: PluginConfig | undefined;
    try {
      setupConfig = plugin.setup?.(api, hooks) ?? {};
      const cleanup = setupConfig.cleanup?.bind(setupConfig);
      return {
        ...setupConfig,
        cleanup,
        theme: plugin.theme
          ? setupConfig.theme
            ? deepMergeTheme(deepMergeTheme(DEFAULT_THEME, plugin.theme), setupConfig.theme)
            : plugin.theme
          : setupConfig.theme,
        options: plugin.options
          ? { ...plugin.options, ...setupConfig.options }
          : setupConfig.options,
        actions: plugin.actions
          ? [...plugin.actions, ...(setupConfig.actions ?? [])]
          : setupConfig.actions,
        hooks: plugin.hooks ? { ...plugin.hooks, ...setupConfig.hooks } : setupConfig.hooks,
      };
    } catch (error) {
      if (setupConfig) cleanupPlugin({ plugin, config: setupConfig });
      throw new PluginSetupError(plugin.name, error);
    }
  };

  const register = (plugin: Plugin, api: ReactGrabAPI) => {
    if (isDisposed) return;

    const config = preparePluginConfig(plugin, api);
    const registeredPlugin = { plugin, config };
    const previousPlugin = plugins.get(plugin.name);
    const nextPlugins = new Map(plugins);
    nextPlugins.set(plugin.name, registeredPlugin);
    let nextStore: PluginStoreState;
    try {
      nextStore = createPluginStoreState(nextPlugins.values());
    } catch (error) {
      cleanupPlugin(registeredPlugin);
      throw new PluginSetupError(plugin.name, error);
    }

    plugins.set(plugin.name, registeredPlugin);
    applyPluginStoreState(nextStore);
    if (previousPlugin) cleanupPlugin(previousPlugin);
  };

  const unregister = (name: string) => {
    if (isDisposed) return;
    const registered = plugins.get(name);
    if (!registered) return;

    plugins.delete(name);
    cleanupPlugin(registered);
    recomputeStore();
  };

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;

    const registeredPlugins = Array.from(plugins.values());
    plugins.clear();
    registeredPlugins.forEach(cleanupPlugin);
    recomputeStore();
  };

  const getPluginNames = (): string[] => {
    return Array.from(plugins.keys());
  };

  const callHook = <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): void => {
    for (const { plugin, config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((...hookArgs: Parameters<NonNullable<PluginHooks[K]>>) => void | Promise<void>)
        | undefined;
      if (hook) {
        try {
          const pendingResult = hook(...args);
          if (pendingResult) {
            void Promise.resolve(pendingResult).catch((error) => {
              reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
            });
          }
        } catch (error) {
          reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
        }
      }
    }
  };

  const callHookWithHandled = <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): boolean => {
    let handled = false;
    for (const { plugin, config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((...hookArgs: Parameters<NonNullable<PluginHooks[K]>>) => boolean | void)
        | undefined;
      if (hook) {
        try {
          const result = hook(...args);
          if (result === true) {
            handled = true;
          }
        } catch (error) {
          reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
        }
      }
    }
    return handled;
  };

  const callHookAsync = async <K extends HookName>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> => {
    for (const { plugin, config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((
            ...hookArgs: Parameters<NonNullable<PluginHooks[K]>>
          ) => ReturnType<NonNullable<PluginHooks[K]>>)
        | undefined;
      if (hook) {
        try {
          await hook(...args);
        } catch (error) {
          reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
        }
      }
    }
  };

  const callHookReduce = async <T>(
    hookName: HookName,
    initialValue: T,
    ...extraArgs: unknown[]
  ): Promise<T> => {
    let result = initialValue;
    for (const { plugin, config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((value: T, ...hookArgs: unknown[]) => T | Promise<T>)
        | undefined;
      if (hook) {
        try {
          result = await hook(result, ...extraArgs);
        } catch (error) {
          reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
        }
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
    for (const { plugin, config } of plugins.values()) {
      const hook = config.hooks?.[hookName] as
        | ((value: T, ...hookArgs: unknown[]) => T)
        | undefined;
      if (hook) {
        try {
          result = hook(result, ...extraArgs);
        } catch (error) {
          reportRecoverableError(new PluginHookError(plugin.name, String(hookName), error));
        }
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
      const pendingResults: Promise<boolean>[] = [];
      for (const { plugin, config } of plugins.values()) {
        const hook = config.hooks?.onElementSelect;
        if (hook) {
          try {
            const result = hook(element);
            if (result) {
              wasIntercepted = true;
              if (result === true) continue;
              pendingResults.push(
                result.catch((error) => {
                  reportRecoverableError(
                    new PluginHookError(plugin.name, "onElementSelect", error),
                  );
                  return false;
                }),
              );
            }
          } catch (error) {
            reportRecoverableError(new PluginHookError(plugin.name, "onElementSelect", error));
          }
        }
      }
      const pendingResult =
        pendingResults.length > 0
          ? Promise.all(pendingResults).then((results) => results.every(Boolean))
          : undefined;
      return { wasIntercepted, pendingResult };
    },
    onDragStart: (startX: number, startY: number) => callHook("onDragStart", startX, startY),
    onDragEnd: (elements: Element[], bounds: DragRect) => callHook("onDragEnd", elements, bounds),
    onBeforeCopy: async (elements: Element[]) => callHookAsync("onBeforeCopy", elements),
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
    onSelectionBox: (visible: boolean, bounds: OverlayBounds | null, element: Element | null) =>
      callHook("onSelectionBox", visible, bounds, element),
    onDragBox: (visible: boolean, bounds: OverlayBounds | null) =>
      callHook("onDragBox", visible, bounds),
    onGrabbedBox: (bounds: OverlayBounds, element: Element) =>
      callHook("onGrabbedBox", bounds, element),
    onElementLabel: (
      visible: boolean,
      variant: ElementLabelVariant,
      context: ElementLabelContext,
    ) => callHook("onElementLabel", visible, variant, context),
    onContextMenu: (element: Element, position: Position) =>
      callHook("onContextMenu", element, position),
    onOpenFile: (filePath: string, lineNumber?: number) =>
      callHookWithHandled("onOpenFile", filePath, lineNumber),
    transformHtmlContent: async (html: string, elements: Element[]) =>
      callHookReduce("transformHtmlContent", html, elements),
    transformAgentContext: async (context: AgentContext, elements: Element[]) =>
      callHookReduce("transformAgentContext", context, elements),
    transformActionContext: (context: ActionContext) =>
      callHookReduceSync("transformActionContext", context),
    transformOpenFileUrl: (url: string, filePath: string, lineNumber?: number) =>
      callHookReduceSync("transformOpenFileUrl", url, filePath, lineNumber),
  };

  if (getOwner()) {
    onCleanup(dispose);
  }

  return {
    register,
    unregister,
    getPluginNames,
    setOptions,
    dispose,
    store,
    hooks,
  };
};

export { createPluginRegistry };
