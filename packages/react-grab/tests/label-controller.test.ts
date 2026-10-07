import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { FADE_COMPLETE_BUFFER_MS, FEEDBACK_DURATION_MS } from "../src/constants.js";
import { createLabelController } from "../src/core/label-controller.js";
import type { SelectionLabelInstance } from "../src/types.js";

const LABEL_BOUNDS = {
  borderRadius: "0px",
  height: 20,
  width: 40,
  x: 10,
  y: 10,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    clearTimeout: globalThis.clearTimeout,
    setTimeout: globalThis.setTimeout,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("createLabelController", () => {
  it("restores a fading copied label while it is hovered", () => {
    const labelInstances: SelectionLabelInstance[] = [];
    const controller = createLabelController(
      {
        clearLabelInstances: () => {
          labelInstances.length = 0;
        },
        addLabelInstance: (instance) => {
          labelInstances.push(instance);
        },
        updateLabelInstance: (instanceId, status, errorMessage) => {
          const instance = labelInstances.find((labelInstance) => labelInstance.id === instanceId);
          if (!instance) return;
          instance.status = status;
          instance.errorMessage = errorMessage;
        },
        removeLabelInstance: (instanceId) => {
          const instanceIndex = labelInstances.findIndex(
            (labelInstance) => labelInstance.id === instanceId,
          );
          if (instanceIndex >= 0) labelInstances.splice(instanceIndex, 1);
        },
      },
      () => labelInstances,
    );
    const instanceId = controller.createInstance(LABEL_BOUNDS, "button", undefined, "copying");

    controller.updateAfterCopy(instanceId, true);
    vi.advanceTimersByTime(FEEDBACK_DURATION_MS);
    expect(labelInstances[0]?.status).toBe("fading");

    controller.handleHoverChange(instanceId, true);
    expect(labelInstances[0]?.status).toBe("copied");

    vi.advanceTimersByTime(FADE_COMPLETE_BUFFER_MS);
    expect(labelInstances).toHaveLength(1);

    controller.handleHoverChange(instanceId, false);
    vi.advanceTimersByTime(FEEDBACK_DURATION_MS + FADE_COMPLETE_BUFFER_MS);
    expect(labelInstances).toHaveLength(0);
  });
});
