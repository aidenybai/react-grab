import type { Plugin } from "../../types.js";

export const copyPlugin: Plugin = {
  name: "copy",
  setup: (api) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          api.copyElement(element);
          return true;
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
        cancelPendingToolbarActions: () => {
          isPendingSelection = false;
        },
      },
      actions: [
        {
          id: "copy",
          label: "Copy",
          shortcut: "C",
          onAction: (context) => {
            context.copy?.();
          },
        },
        {
          id: "copy-toolbar",
          label: "Copy element",
          shortcut: "C",
          target: "toolbar",
          onAction: () => {
            isPendingSelection = true;
            api.activate();
          },
        },
      ],
    };
  },
};
