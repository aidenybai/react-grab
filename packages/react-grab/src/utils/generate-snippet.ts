import { isInstrumentationActive } from "bippy";
import { getStack, formatStack, getHTMLPreview } from "../instrumentation.js";

const wrapInSelectedElementTags = (context: string): string =>
  `<selected_element>\n${context}\n</selected_element>`;

export const generateSnippet = async (elements: Element[]): Promise<string> => {
  const isReactProject = isInstrumentationActive();

  const elementSnippetResults = await Promise.allSettled(
    elements.map(async (element) => {
      const htmlPreview = getHTMLPreview(element);

      if (!isReactProject) {
        return `## HTML Frame:\n${htmlPreview}`;
      }

      const stack = await getStack(element);
      const formattedStack = formatStack(stack);

      if (formattedStack) {
        return `## HTML Frame:\n${htmlPreview}\n\n## Code Location:\n${formattedStack}`;
      }

      return `## HTML Frame:\n${htmlPreview}`;
    }),
  );

  const elementSnippets = elementSnippetResults
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .filter((snippet) => snippet.trim());

  if (elementSnippets.length === 0) {
    return "";
  }

  return elementSnippets
    .map((snippet) => wrapInSelectedElementTags(snippet))
    .join("\n\n");
};
