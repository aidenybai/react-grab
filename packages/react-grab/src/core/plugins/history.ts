import type { Plugin } from "../../types.js";
import { startRenderHistory, stopRenderHistory } from "../render-history.js";

export const historyPlugin: Plugin = {
  name: "history",
  setup: () => {
    startRenderHistory();
    return {
      actions: [
        {
          id: "history",
          label: "History",
          shortcut: "H",
          shortcutModifier: false,
          showInToolbarMenu: true,
          onAction: (context) => {
            context.enterHistoryMode?.();
          },
        },
      ],
      cleanup: () => {
        stopRenderHistory();
      },
    };
  },
};
