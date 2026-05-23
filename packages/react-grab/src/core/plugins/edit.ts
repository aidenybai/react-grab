import type { Plugin } from "../../types.js";

export const editPlugin: Plugin = {
  name: "edit",
  setup: () => ({
    actions: [
      {
        id: "edit",
        label: "Edit",
        shortcut: "Enter",
        showInToolbarMenu: true,
        onAction: (context) => {
          context.enterEditMode?.();
        },
      },
    ],
  }),
};
