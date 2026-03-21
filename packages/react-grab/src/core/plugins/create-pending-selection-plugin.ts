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
      },
      actions: [resolvedContextMenuAction],
      cleanup: config.cleanup,
    };
  },
});
