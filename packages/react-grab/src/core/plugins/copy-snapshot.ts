import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyContent } from "../../utils/copy-content.js";
import { serializeElement } from "../../utils/snapshot/serialize-element.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";
import { disposeSnapshotBaseline } from "../../utils/snapshot/snapshot-style-diff.js";

export const copySnapshotPlugin = createPendingSelectionPlugin({
  name: "copy-snapshot",
  contextMenuAction: (api) => ({
    id: "copy-snapshot",
    label: "Copy snapshot",
    showInToolbarMenu: true,
    onAction: async (context) => {
      await context.performWithFeedback(async () => {
        const serializedFragments = await Promise.all(
          context.elements.map((element) =>
            serializeElement(element, { inlineImages: true, embedFonts: true }),
          ),
        );

        const successResults = serializedFragments.filter(
          (result) => result.status === "success" && result.html,
        );

        const combinedHtml = successResults.map((result) => result.html).join("\n\n");
        if (!combinedHtml) return false;

        const allFontsCss = successResults
          .map((result) => result.fontsCss)
          .filter(Boolean)
          .join("\n");
        const allShadowCss = successResults
          .map((result) => result.shadowCss)
          .filter(Boolean)
          .join("\n");
        const allScrollbarCss = successResults
          .map((result) => result.scrollbarCss)
          .filter(Boolean)
          .join("\n");
        const allElementCss = successResults
          .map((result) => result.elementCss)
          .filter(Boolean)
          .join("\n");
        const allBaseCss = successResults
          .map((result) => result.baseCss)
          .filter(Boolean)
          .join("\n");

        const combinedCss = [allBaseCss, allFontsCss, allShadowCss, allScrollbarCss, allElementCss].filter(Boolean).join("\n");
        const styleBlock = combinedCss ? `<style>${combinedCss}</style>\n` : "";

        const fullHtml = styleBlock + combinedHtml;

        const stackContext = await api.getStackContext(context.element);
        return copyContent(appendStackContext(fullHtml, stackContext), {
          componentName: context.componentName,
          tagName: context.tagName,
        });
      });
    },
  }),
  cleanup: disposeSnapshotBaseline,
});
