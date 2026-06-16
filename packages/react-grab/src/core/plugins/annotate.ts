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
        shortcut: "D",
        shortcutModifier: false,
        showInToolbarMenu: true,
        // Resolve once at setup so the gate is a plain boolean - lets the toolbar
        // menu/default-action code reuse resolveActionEnabled without a context.
        enabled: isScreenshotSupported(),
        onAction: (context) => {
          context.enterAnnotateMode?.();
        },
      },
    ],
  }),
};
