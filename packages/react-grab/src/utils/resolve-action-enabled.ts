import type { ActionContext, ContextMenuAction } from "../types.js";

const resolveBooleanEnabled = (enabled: boolean | undefined): boolean => enabled ?? true;

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
