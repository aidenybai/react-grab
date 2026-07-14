import { RecoverableError } from "../errors.js";
import type { ToolbarState } from "../types.js";
import { reportRecoverableError } from "./report-recoverable-error.js";

const reportSubscriberError = (error: unknown): void => {
  reportRecoverableError(new RecoverableError("Toolbar state change subscriber failed", error));
};

export const notifyToolbarStateChangeSubscribers = (
  subscribers: ReadonlySet<(state: ToolbarState) => void>,
  state: ToolbarState,
): void => {
  for (const subscriber of subscribers) {
    try {
      void Promise.resolve(subscriber(state)).catch(reportSubscriberError);
    } catch (error) {
      reportSubscriberError(error);
    }
  }
};
