import type { Plugin } from "../../types.js";

export const editPlugin: Plugin = {
  name: "edit",
  actions: [
    {
      id: "edit",
      label: "Style",
      shortcut: "S",
      shortcutModifier: false,
      showInToolbarMenu: true,
      onAction: (context) => {
        context.enterEditMode?.();
      },
    },
  ],
};
