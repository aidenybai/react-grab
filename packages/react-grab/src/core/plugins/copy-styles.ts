import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import {
  extractElementCss,
  disposeBaselineStyles,
} from "../../utils/extract-element-css.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyStylesPlugin = createPendingSelectionPlugin({
  name: "copy-styles",
  onPendingSelect: (element, api) => {
    const extractedCss = extractElementCss(element);
    void api
      .getStackContext(element)
      .then((stackContext) => {
        copyContent(appendStackContext(extractedCss, stackContext));
      })
      .catch((error) => {
        logRecoverableError("Failed to copy styles on element select", error);
      });
  },
  contextMenuAction: (api) => ({
    id: "copy-styles",
    label: "Copy styles",
    showInToolbarMenu: true,
    onAction: async (context) => {
      await context.performWithFeedback(async () => {
        const combinedCss = context.elements
          .map(extractElementCss)
          .join("\n\n");

        const stackContext = await api.getStackContext(context.element);
        return copyContent(appendStackContext(combinedCss, stackContext), {
          componentName: context.componentName,
          tagName: context.tagName,
        });
      });
    },
  }),
  cleanup: disposeBaselineStyles,
});
