import { appendStackContext } from "../../utils/append-stack-context.js";
import { copyImageToClipboard } from "../../utils/copy-image-to-clipboard.js";
import { generateSnippet } from "../../utils/generate-snippet.js";
import { joinSnippets } from "../../utils/join-snippets.js";
import { renderTextToImage } from "../../utils/render-text-to-image.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyImagePlugin = createPendingSelectionPlugin({
  name: "copy-image",
  contextMenuAction: (api) => ({
    id: "copy-image",
    label: "Copy as Image",
    showInToolbarMenu: true,
    onAction: async (context) => {
      await context.performWithFeedback(async () => {
        const rawSnippets = await generateSnippet(context.elements);
        const nonEmptySnippets = rawSnippets.filter((snippet) =>
          snippet.trim(),
        );

        if (nonEmptySnippets.length === 0) return false;

        const combinedContent = joinSnippets(nonEmptySnippets);
        const stackContext = await api.getStackContext(context.element);
        const fullContent = appendStackContext(combinedContent, stackContext);
        const imageBlob = await renderTextToImage(fullContent);
        const displayName =
          context.componentName ?? context.tagName ?? "element";

        return copyImageToClipboard(imageBlob, displayName);
      });
    },
  }),
});
