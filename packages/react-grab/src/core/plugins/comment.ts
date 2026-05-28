import type { Plugin } from "../../types.js";

export const commentPlugin: Plugin = {
  name: "comment",
  setup: () => ({
    actions: [
      {
        id: "comment",
        label: "Comment",
        shortcut: "/",
        showInToolbarMenu: true,
        onAction: (context) => {
          context.enterPromptMode?.();
        },
      },
    ],
  }),
};
