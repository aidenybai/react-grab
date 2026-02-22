import type { Plugin } from "../../types.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
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
          void Promise.all([
            hooks.transformHtmlContent(element.outerHTML, [element]),
            api.getStackContext(element),
          ])
            .then(([transformedHtml, stackContext]) => {
              if (!transformedHtml) return;
              copyContent(appendStackContext(transformedHtml, stackContext));
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

              const stackContext = await api.getStackContext(context.element);
              return copyContent(
                appendStackContext(transformedHtml, stackContext),
                {
                  componentName: context.componentName,
                  tagName: context.tagName,
                },
              );
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
