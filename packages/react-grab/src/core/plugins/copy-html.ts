import type { Plugin } from "../../types.js";
import { copyContent } from "../../utils/copy-content.js";

export const copyHtmlPlugin: Plugin = {
  name: "copy-html",
  actions: [
    {
      id: "copy-html",
      label: "Copy HTML",
      onAction: async (context) => {
        await context.performWithFeedback(async () => {
          const htmlElements = context.elements.filter(
            (element): element is HTMLElement => element instanceof HTMLElement,
          );
          const combinedHtml = htmlElements
            .map((element) => element.outerHTML)
            .join("\n\n");

          const transformedHtml = await context.hooks.transformHtmlContent(
            combinedHtml,
            context.elements,
          );

          if (!transformedHtml) return false;

          return copyContent(transformedHtml);
        });
      },
    },
  ],
  setup: (api) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          api.deactivate();
          if (element instanceof HTMLElement) {
            copyContent(element.outerHTML);
          }
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
      },
      actions: [
        {
          id: "copy-html-toolbar",
          label: "Copy HTML",
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
