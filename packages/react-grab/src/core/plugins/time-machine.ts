import { TIME_MACHINE_ACTION_ID } from "../../constants.js";
import type { Plugin } from "../../types.js";
import { IS_DEMO } from "../../utils/runtime-mode.js";
import {
  hasTimeMachineHistory,
  startTimeMachineRecorder,
  stopTimeMachineRecorder,
} from "../time-machine-recorder.js";

export const timeMachinePlugin: Plugin = {
  name: "time-machine",
  setup: () => {
    // The demo build is a display-only showcase scoped to one container;
    // recording the host page's commits and wrapping its global scheduling
    // clock from inside it would be exactly the kind of side effect demo
    // mode exists to rule out. IS_DEMO folds at build time, so the recorder
    // is dead-code-eliminated from the demo bundle.
    if (!IS_DEMO) startTimeMachineRecorder();
    return {
      actions: [
        {
          id: TIME_MACHINE_ACTION_ID,
          label: "Time Machine",
          shortcut: "H",
          shortcutModifier: false,
          showInToolbarMenu: true,
          enabled: () => hasTimeMachineHistory(),
          onAction: (context) => {
            context.enterTimeMachine?.();
          },
        },
      ],
      cleanup: stopTimeMachineRecorder,
    };
  },
};
