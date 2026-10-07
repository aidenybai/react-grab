import type { Plugin } from "../../types.js";

export const copyPlugin: Plugin = {
  name: "copy",
  actions: [
    {
      id: "copy",
      label: "Copy",
      shortcut: "C",
      showInToolbarMenu: true,
      onAction: (context) => {
        context.copy?.();
      },
    },
  ],
};
