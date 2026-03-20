import { captureElementScreenshot } from "../../utils/capture-element-screenshot.js";
import { copyContentWithImage } from "../../utils/copy-content-with-image.js";
import { appendStackContext } from "../../utils/append-stack-context.js";
import { generateSnippet } from "../../utils/generate-snippet.js";
import { joinSnippets } from "../../utils/join-snippets.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import type { Plugin } from "../../types.js";

export const copyScreenshotPlugin: Plugin = {
  name: "copy-screenshot",
  setup: (api, hooks) => ({
    actions: [
      {
        id: "copy-screenshot",
        label: "Copy with screenshot",
        shortcut: "S",
        onAction: async (context) => {
          await context.performWithFeedback(async () => {
            const primaryElement = context.elements[0] ?? context.element;

            const [imageBlob, rawSnippets, stackContext] = await Promise.all([
              captureElementScreenshot(primaryElement),
              generateSnippet(context.elements),
              api.getStackContext(primaryElement),
            ]);

            if (!imageBlob) return false;

            const transformedSnippets = await Promise.all(
              rawSnippets.map((snippet, index) =>
                snippet.trim()
                  ? hooks.transformHtmlContent(snippet, [
                      context.elements[index],
                    ])
                  : Promise.resolve(""),
              ),
            );

            const nonEmptySnippets = transformedSnippets.filter((snippet) =>
              snippet.trim(),
            );
            const combinedContent = joinSnippets(nonEmptySnippets);

            if (!combinedContent.trim()) return false;

            const contentWithContext = appendStackContext(
              combinedContent,
              stackContext,
            );

            try {
              return await copyContentWithImage({
                content: contentWithContext,
                imageBlob,
                componentName: context.componentName,
              });
            } catch (error) {
              logRecoverableError("Failed to copy with screenshot", error);
              return false;
            }
          });
        },
      },
    ],
  }),
};
