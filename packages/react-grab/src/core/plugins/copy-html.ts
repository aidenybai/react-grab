import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyHtmlPlugin = createPendingSelectionPlugin({
  name: "copy-html",
  onPendingSelect: (element, api, hooks) => {
    void Promise.all([
      hooks.transformHtmlContent(element.outerHTML, [element]),
      api.getStackContext(element),
    ])
      .then(([transformedHtml, stackContext]) => {
        if (!transformedHtml) return;
        copyContent(appendStackContext(transformedHtml, stackContext));
      })
      .catch((error) => {
        logRecoverableError("Failed to copy HTML on element select", error);
      });
  },
  contextMenuAction: (api) => ({
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
        return copyContent(appendStackContext(transformedHtml, stackContext), {
          componentName: context.componentName,
          tagName: context.tagName,
        });
      });
    },
  }),
  toolbarAction: {
    id: "copy-html-toolbar",
    label: "Copy HTML",
  },
});
