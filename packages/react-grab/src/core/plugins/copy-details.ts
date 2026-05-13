import { copyContent } from "../../utils/copy-content.js";
import { generateSnippet } from "../../utils/generate-snippet.js";
import { joinSnippets } from "../../utils/join-snippets.js";
import { createPendingSelectionPlugin } from "./create-pending-selection-plugin.js";

export const copyDetailsPlugin = createPendingSelectionPlugin({
  name: "copy-details",
  contextMenuAction: (_api, _hooks) => ({
    id: "copy-details",
    label: "Copy details",
    showInToolbarMenu: true,
    onAction: async (context) => {
      await context.performWithFeedback(async () => {
        const rawSnippets = await generateSnippet(context.elements);
        const nonEmptySnippets = rawSnippets.filter((snippet) => snippet.trim());
        if (nonEmptySnippets.length === 0) return false;
        const joinedContent = joinSnippets(nonEmptySnippets);
        const transformedContent = await context.hooks.transformHtmlContent(
          joinedContent,
          context.elements,
        );
        if (!transformedContent) return false;
        return copyContent(transformedContent, {
          componentName: context.componentName,
          tagName: context.tagName,
        });
      });
    },
  }),
});
