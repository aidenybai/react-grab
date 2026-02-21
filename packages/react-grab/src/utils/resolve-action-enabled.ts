import type {
  ActionContext,
  ContextMenuAction,
  ToolbarMenuAction,
} from "../types.js";

export const resolveActionEnabled = (
  action: ContextMenuAction,
  context: ActionContext | undefined,
): boolean => {
  if (typeof action.enabled === "function") {
    return context ? action.enabled(context) : false;
  }
  return action.enabled ?? true;
};

export const resolveToolbarActionEnabled = (
  action: ToolbarMenuAction,
): boolean => {
  if (typeof action.enabled === "function") {
    return action.enabled();
  }
  return action.enabled ?? true;
};
