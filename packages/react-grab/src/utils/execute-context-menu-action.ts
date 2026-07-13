import type { ContextMenuAction, ContextMenuActionContext } from "../types.js";
import { logRecoverableError } from "./log-recoverable-error.js";
import { resolveActionEnabled } from "./resolve-action-enabled.js";

export const executeContextMenuAction = (
  action: ContextMenuAction,
  context: ContextMenuActionContext,
): boolean => {
  try {
    if (!resolveActionEnabled(action, context)) return false;
  } catch (error) {
    logRecoverableError(`Action "${action.id}" enabled check failed`, error);
    return false;
  }

  try {
    const pendingAction = action.onAction(context);
    if (pendingAction) {
      void pendingAction.catch((error: unknown) => {
        logRecoverableError(`Action "${action.id}" failed`, error);
      });
    }
  } catch (error) {
    logRecoverableError(`Action "${action.id}" failed`, error);
  }

  return true;
};
