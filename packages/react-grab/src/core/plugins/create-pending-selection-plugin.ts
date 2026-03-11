import type {
  Plugin,
  ReactGrabAPI,
  ActionContextHooks,
  ContextMenuAction,
} from "../../types.js";

type ContextMenuActionFactory =
  | ContextMenuAction
  | ((api: ReactGrabAPI, hooks: ActionContextHooks) => ContextMenuAction);

interface PendingSelectionPluginConfig {
  name: string;
  onPendingSelect: (
    element: Element,
    api: ReactGrabAPI,
    hooks: ActionContextHooks,
  ) => void;
  contextMenuAction: ContextMenuActionFactory;
  toolbarAction: { id: string; label: string; shortcut?: string };
  cleanup?: () => void;
}

export const createPendingSelectionPlugin = (
  config: PendingSelectionPluginConfig,
): Plugin => ({
  name: config.name,
  setup: (api, hooks) => {
    let isPendingSelection = false;

    const resolvedContextMenuAction =
      typeof config.contextMenuAction === "function"
        ? config.contextMenuAction(api, hooks)
        : config.contextMenuAction;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          config.onPendingSelect(element, api, hooks);
          return true;
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
        cancelPendingToolbarActions: () => {
          isPendingSelection = false;
        },
      },
      actions: [
        resolvedContextMenuAction,
        {
          id: config.toolbarAction.id,
          label: config.toolbarAction.label,
          shortcut: config.toolbarAction.shortcut,
          target: "toolbar" as const,
          onAction: () => {
            isPendingSelection = true;
            api.activate();
          },
        },
      ],
      cleanup: config.cleanup,
    };
  },
});
