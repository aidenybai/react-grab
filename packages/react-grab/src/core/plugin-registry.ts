import { createStore } from "solid-js/store";
import type {
  Plugin,
  PluginContribution,
  PluginHooks,
  Theme,
  AgentOptions,
  ContextMenuAction,
  ReactGrabState,
  PromptModeContext,
  OverlayBounds,
  DragRect,
  ElementLabelVariant,
  ElementLabelContext,
  CrosshairContext,
} from "../types.js";
import { DEFAULT_THEME, deepMergeTheme } from "./theme.js";

interface RegisteredPlugin {
  plugin: Plugin;
  contribution: PluginContribution;
}

interface PluginStoreState {
  theme: Required<Theme>;
  agent: AgentOptions | undefined;
  contextMenuActions: ContextMenuAction[];
}

type HookName = keyof PluginHooks;

const createPluginRegistry = () => {
  const plugins = new Map<string, RegisteredPlugin>();

  const [store, setStore] = createStore<PluginStoreState>({
    theme: DEFAULT_THEME,
    agent: undefined,
    contextMenuActions: [],
  });

  const recomputeStore = () => {
    let mergedTheme: Required<Theme> = DEFAULT_THEME;
    let mergedAgent: AgentOptions | undefined = undefined;
    const allContextMenuActions: ContextMenuAction[] = [];

    for (const { contribution } of plugins.values()) {
      if (contribution.theme) {
        mergedTheme = deepMergeTheme(mergedTheme, contribution.theme);
      }

      if (contribution.agent) {
        const agentContribution = contribution.agent as AgentOptions;
        if (mergedAgent) {
          mergedAgent = Object.assign({}, mergedAgent, agentContribution);
        } else {
          mergedAgent = agentContribution;
        }
      }

      if (contribution.contextMenuActions) {
        allContextMenuActions.push(...contribution.contextMenuActions);
      }
    }

    setStore("theme", mergedTheme);
    setStore("agent", mergedAgent);
    setStore("contextMenuActions", allContextMenuActions);
  };

  const register = (plugin: Plugin, api: unknown) => {
    if (plugins.has(plugin.name)) {
      unregister(plugin.name);
    }

    let contribution: PluginContribution;

    if (plugin.setup) {
      const setupResult = plugin.setup(api as Parameters<NonNullable<Plugin["setup"]>>[0]);
      contribution = setupResult ?? {};
    } else {
      contribution = {};
    }

    if (plugin.theme) {
      contribution.theme = contribution.theme
        ? deepMergeTheme(
            deepMergeTheme(DEFAULT_THEME, plugin.theme),
            contribution.theme,
          )
        : plugin.theme;
    }

    if (plugin.agent) {
      contribution.agent = contribution.agent
        ? { ...plugin.agent, ...contribution.agent }
        : plugin.agent;
    }

    if (plugin.contextMenuActions) {
      contribution.contextMenuActions = [
        ...plugin.contextMenuActions,
        ...(contribution.contextMenuActions ?? []),
      ];
    }

    if (plugin.hooks) {
      contribution.hooks = contribution.hooks
        ? { ...plugin.hooks, ...contribution.hooks }
        : plugin.hooks;
    }

    plugins.set(plugin.name, { plugin, contribution });
    recomputeStore();
  };

  const unregister = (name: string) => {
    const registered = plugins.get(name);
    if (!registered) return;

    if (registered.contribution.cleanup) {
      registered.contribution.cleanup();
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
    for (const { contribution } of plugins.values()) {
      const hook = contribution.hooks?.[hookName] as
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
    for (const { contribution } of plugins.values()) {
      const hook = contribution.hooks?.[hookName] as
        | ((...hookArgs: Parameters<NonNullable<PluginHooks[K]>>) => boolean | void)
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
    for (const { contribution } of plugins.values()) {
      const hook = contribution.hooks?.[hookName] as
        | ((...hookArgs: Parameters<NonNullable<PluginHooks[K]>>) => ReturnType<NonNullable<PluginHooks[K]>>)
        | undefined;
      if (hook) {
        await hook(...args);
      }
    }
  };

  const hooks = {
    onActivate: () => callHook("onActivate"),
    onDeactivate: () => callHook("onDeactivate"),
    onElementHover: (element: Element) => callHook("onElementHover", element),
    onElementSelect: (element: Element) => callHook("onElementSelect", element),
    onDragStart: (startX: number, startY: number) => callHook("onDragStart", startX, startY),
    onDragEnd: (elements: Element[], bounds: DragRect) => callHook("onDragEnd", elements, bounds),
    onBeforeCopy: async (elements: Element[]) => callHookAsync("onBeforeCopy", elements),
    onAfterCopy: (elements: Element[], success: boolean) => callHook("onAfterCopy", elements, success),
    onCopySuccess: (elements: Element[], content: string) => callHook("onCopySuccess", elements, content),
    onCopyError: (error: Error) => callHook("onCopyError", error),
    onStateChange: (state: ReactGrabState) => callHook("onStateChange", state),
    onPromptModeChange: (isPromptMode: boolean, context: PromptModeContext) =>
      callHook("onPromptModeChange", isPromptMode, context),
    onSelectionBox: (visible: boolean, bounds: OverlayBounds | null, element: Element | null) =>
      callHook("onSelectionBox", visible, bounds, element),
    onDragBox: (visible: boolean, bounds: OverlayBounds | null) => callHook("onDragBox", visible, bounds),
    onGrabbedBox: (bounds: OverlayBounds, element: Element) => callHook("onGrabbedBox", bounds, element),
    onElementLabel: (visible: boolean, variant: ElementLabelVariant, context: ElementLabelContext) =>
      callHook("onElementLabel", visible, variant, context),
    onCrosshair: (visible: boolean, context: CrosshairContext) => callHook("onCrosshair", visible, context),
    onContextMenu: (element: Element, position: { x: number; y: number }) =>
      callHook("onContextMenu", element, position),
    onOpenFile: (filePath: string, lineNumber?: number) => callHookWithHandled("onOpenFile", filePath, lineNumber),
  };

  return {
    register,
    unregister,
    getPluginNames,
    store,
    hooks,
  };
};

export { createPluginRegistry };
