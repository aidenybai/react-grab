import type { ActionContext, ContextMenuAction } from "../types.js";
import { ContextMenuActionEnabledError } from "../errors.js";
import { reportRecoverableError } from "./report-recoverable-error.js";

const resolveBooleanEnabled = (enabled: boolean | undefined): boolean => enabled ?? true;

export const resolveActionEnabled = (
  action: ContextMenuAction,
  context: ActionContext | undefined,
): boolean => {
  if (typeof action.enabled === "function") {
    if (!context) {
      return false;
    }

    try {
      return action.enabled(context);
    } catch (error) {
      reportRecoverableError(new ContextMenuActionEnabledError(action.id, error));
      return false;
    }
  }

  return resolveBooleanEnabled(action.enabled);
};
