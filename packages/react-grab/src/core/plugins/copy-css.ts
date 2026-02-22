import type { Plugin } from "../../types.js";
import { copyContent } from "../../utils/copy-content.js";
import {
  extractElementCss,
  disposeBaselineStyles,
} from "../../utils/extract-element-css.js";
import {
  formatSourceAnnotation,
  appendSourceAnnotation,
} from "../../utils/format-source-annotation.js";

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
            .getSource(element)
            .then((sourceInfo) => {
              const annotation = formatSourceAnnotation(
                sourceInfo?.componentName,
                sourceInfo?.filePath,
                sourceInfo?.lineNumber,
              );
              copyContent(appendSourceAnnotation(extractedCss, annotation), {
                componentName: sourceInfo?.componentName ?? undefined,
              });
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

              const annotation = formatSourceAnnotation(
                context.componentName,
                context.filePath,
                context.lineNumber,
              );
              return copyContent(
                appendSourceAnnotation(combinedCss, annotation),
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
