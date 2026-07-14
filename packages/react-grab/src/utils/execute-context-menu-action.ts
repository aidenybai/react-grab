import type { ContextMenuAction, ContextMenuActionContext } from "../types.js";
import { ContextMenuActionError } from "../errors.js";
import { resolveActionEnabled } from "./resolve-action-enabled.js";
import { reportRecoverableError } from "./report-recoverable-error.js";

export const executeContextMenuAction = (
  action: ContextMenuAction,
  context: ContextMenuActionContext,
): boolean => {
  if (!resolveActionEnabled(action, context)) return false;

  try {
    const pendingAction = action.onAction(context);
    if (pendingAction) {
      void pendingAction.catch((error: unknown) => {
        reportRecoverableError(new ContextMenuActionError(action.id, error));
      });
    }
  } catch (error) {
    reportRecoverableError(new ContextMenuActionError(action.id, error));
  }

  return true;
};
