import type { ActionContext, ContextMenuAction } from "../types.js";
import { logRecoverableError } from "./log-recoverable-error.js";

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
      logRecoverableError(`Action "${action.id}" enabled check failed`, error);
      return false;
    }
  }

  return resolveBooleanEnabled(action.enabled);
};
