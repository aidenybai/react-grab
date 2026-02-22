import type { Plugin } from "../../types.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import {
  extractElementCss,
  disposeBaselineStyles,
} from "../../utils/extract-element-css.js";

export const copyStylesPlugin: Plugin = {
  name: "copy-styles",
  setup: (api) => {
    let isPendingSelection = false;

    return {
      hooks: {
        onElementSelect: (element) => {
          if (!isPendingSelection) return;
          isPendingSelection = false;
          const extractedCss = extractElementCss(element);
          void api
            .getStackContext(element)
            .then((stackContext) => {
              copyContent(appendStackContext(extractedCss, stackContext));
            })
            // HACK: Best-effort copy from element select; failure is non-critical
            .catch(() => {});
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
          id: "copy-styles",
          label: "Copy styles",
          onAction: async (context) => {
            await context.performWithFeedback(async () => {
              const combinedCss = context.elements
                .map(extractElementCss)
                .join("\n\n");

              const stackContext = await api.getStackContext(context.element);
              return copyContent(
                appendStackContext(combinedCss, stackContext),
                {
                  componentName: context.componentName,
                  tagName: context.tagName,
                },
              );
            });
          },
        },
        {
          id: "copy-styles-toolbar",
          label: "Copy styles",
          target: "toolbar",
          onAction: () => {
            isPendingSelection = true;
            api.activate();
          },
        },
      ],
      cleanup: disposeBaselineStyles,
    };
  },
};
