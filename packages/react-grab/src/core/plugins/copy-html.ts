import type { Plugin } from "../../types.js";
import { copyContent } from "../../utils/copy-content.js";

export const copyHtmlPlugin: Plugin = {
  name: "copy-html",
  setup: (api, hooks) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          api.deactivate();
          hooks
            .transformHtmlContent(element.outerHTML, [element])
            .then((transformedHtml) => {
              if (transformedHtml) {
                copyContent(transformedHtml);
              }
            });
          return true;
        },
        onDeactivate: () => {
          isPendingSelection = false;
        },
      },
      actions: [
        {
          id: "copy-html",
          label: "Copy HTML",
          onAction: async (context) => {
            await context.performWithFeedback(async () => {
              const combinedHtml = context.elements
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
