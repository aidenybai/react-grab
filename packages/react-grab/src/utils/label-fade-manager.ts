import { FEEDBACK_DURATION_MS, FADE_COMPLETE_BUFFER_MS } from "../constants.js";

interface LabelInstanceActions {
  updateLabelInstance: (instanceId: string, status: "fading") => void;
  removeLabelInstance: (instanceId: string) => void;
}

export interface LabelFadeManager {
  cancel: (instanceId: string) => void;
  cancelAll: () => void;
  schedule: (instanceId: string) => void;
}

export const createLabelFadeManager = (
  actions: LabelInstanceActions,
): LabelFadeManager => {
  const timeouts = new Map<string, number>();

  const cancel = (instanceId: string) => {
    const timeoutId = timeouts.get(instanceId);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeouts.delete(instanceId);
    }
  };

  const cancelAll = () => {
    for (const timeoutId of timeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    timeouts.clear();
  };

  const schedule = (instanceId: string) => {
    cancel(instanceId);

    const timeoutId = window.setTimeout(() => {
      timeouts.delete(instanceId);
      actions.updateLabelInstance(instanceId, "fading");
      setTimeout(() => {
        timeouts.delete(instanceId);
        actions.removeLabelInstance(instanceId);
      }, FADE_COMPLETE_BUFFER_MS);
    }, FEEDBACK_DURATION_MS);

    timeouts.set(instanceId, timeoutId);
  };

  return { cancel, cancelAll, schedule };
};
