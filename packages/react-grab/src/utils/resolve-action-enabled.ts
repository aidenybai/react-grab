import type { ActionContext, ContextMenuAction, ToolbarMenuAction } from "../types.js";

const resolveBooleanEnabled = (enabled: boolean | undefined): boolean =>
  enabled ?? true;

const resolveBooleanEnabled = (enabled: boolean | undefined): boolean =>
  enabled ?? true;

export const resolveActionEnabled = (
  action: ContextMenuAction,
  context: ActionContext | undefined,
): boolean => {
  if (typeof action.enabled === "function") {
    if (!context) {
      return false;
    }

    return action.enabled(context);
  }

  return resolveBooleanEnabled(action.enabled);
};

export const resolveToolbarActionEnabled = (
  action: ToolbarMenuAction,
): boolean => {
  if (typeof action.enabled === "function") {
    return action.enabled();
  }

  return resolveBooleanEnabled(action.enabled);
};
