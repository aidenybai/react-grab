import type { ContextMenuAction, ContextMenuActionContext } from "../types.js";
import { resolveActionEnabled } from "./resolve-action-enabled.js";
import { logRecoverableError } from "./log-recoverable-error.js";

export const executeContextMenuAction = (
  action: ContextMenuAction,
  context: ContextMenuActionContext,
): boolean => {
  if (!resolveActionEnabled(action, context)) return false;

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
