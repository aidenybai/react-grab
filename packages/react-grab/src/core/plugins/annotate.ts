import { ANNOTATE_ACTION_ID } from "../../constants.js";
import type { Plugin } from "../../types.js";
import { isScreenshotSupported } from "../../utils/is-screenshot-supported.js";

export const annotatePlugin: Plugin = {
  name: "annotate",
  setup: () => ({
    actions: [
      {
        id: ANNOTATE_ACTION_ID,
        label: "Draw",
        shortcut: "A",
        shortcutModifier: false,
        showInToolbarMenu: true,
        enabled: isScreenshotSupported,
        onAction: (context) => {
          context.enterAnnotateMode?.();
        },
      },
    ],
  }),
};
