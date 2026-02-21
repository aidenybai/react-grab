import type { Plugin } from "../../types.js";

export const commentPlugin: Plugin = {
  name: "comment",
  setup: (api) => ({
    actions: [
      {
        id: "comment",
        label: "Comment",
        shortcut: "Enter",
        onAction: (context) => {
          context.enterPromptMode?.();
        },
      },
      {
        id: "comment-toolbar",
        label: "Comment",
        shortcut: "Enter",
        target: "toolbar",
        onAction: () => {
          api.comment();
        },
      },
    ],
  }),
};
