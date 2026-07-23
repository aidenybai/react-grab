import type { Plugin } from "../../types.js";
import { getElementAdapter } from "../element-adapter.js";

export const editPlugin: Plugin = {
  name: "edit",
  actions: [
    {
      id: "edit",
      label: "Style",
      shortcut: "S",
      shortcutModifier: false,
      showInToolbarMenu: true,
      enabled: (context) => getElementAdapter(context.element)?.supportsDomEditing !== false,
      onAction: (context) => {
        context.enterEditMode?.();
      },
    },
  ],
};
