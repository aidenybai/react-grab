import type { Plugin } from "../../types.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import {
  extractElementCss,
  disposeBaselineStyles,
} from "../../utils/extract-element-css.js";

export const copyCssPlugin: Plugin = {
  name: "copy-css",
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
          id: "copy-css",
          label: "Copy CSS",
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
          id: "copy-css-toolbar",
          label: "Copy CSS",
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
