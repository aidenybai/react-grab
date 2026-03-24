import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyHtmlPlugin = createPendingSelectionPlugin({
  name: "copy-html",
  contextMenuAction: (api) => ({
    id: "copy-html",
    label: "Copy HTML",
    showInToolbarMenu: true,
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
        return await copyContent(appendStackContext(transformedHtml, stackContext), {
          componentName: context.componentName,
          tagName: context.tagName,
        });
      });
    },
  }),
});
