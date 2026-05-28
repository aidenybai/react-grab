import type { Plugin } from "../../types.js";

export const editPlugin: Plugin = {
  name: "edit",
  setup: () => ({
    actions: [
      {
        id: "edit",
        label: "Style",
        shortcut: "Enter",
        showInToolbarMenu: true,
        onAction: (context) => {
          context.enterEditMode?.();
        },
      },
    ],
  }),
};
