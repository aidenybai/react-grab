import type { Plugin } from "../../types.js";

export const copyHtmlPlugin: Plugin = {
  name: "copy-html",
  actions: [
    {
      id: "copy-html",
      label: "Copy HTML",
      onAction: async (context) => {
        await context.performWithFeedback(async () => {
          const htmlElements = context.elements.filter(
            (element): element is HTMLElement => element instanceof HTMLElement,
          );
          const combinedHtml = htmlElements
            .map((element) => element.outerHTML)
            .join("\n\n");

          const transformedHtml = await context.hooks.transformHtmlContent(
            combinedHtml,
            context.elements,
          );

          if (!transformedHtml) return false;

          await navigator.clipboard.writeText(transformedHtml);
          return true;
        });
      },
    },
  ],
};
