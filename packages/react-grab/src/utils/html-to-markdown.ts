import TurndownService from "turndown";

let turndownService: TurndownService | null = null;

const getTurndownService = (): TurndownService => {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      bulletListMarker: "-",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
    });

    turndownService.addRule("strikethrough", {
      filter: ["del", "s"],
      replacement: (content) => `~~${content}~~`,
    });

    turndownService.addRule("removeHidden", {
      filter: (node) => {
        if (node instanceof HTMLElement) {
          const style = window.getComputedStyle(node);
          return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          );
        }
        return false;
      },
      replacement: () => "",
    });

    turndownService.addRule("preserveButtons", {
      filter: ["button"],
      replacement: (content) => (content ? `[${content}]` : ""),
    });

    turndownService.addRule("preserveInputs", {
      filter: (node) => {
        if (node.nodeName === "INPUT" && node instanceof HTMLInputElement) {
          return true;
        }
        return false;
      },
      replacement: (_, node) => {
        if (node instanceof HTMLInputElement) {
          const value = node.value || node.placeholder;
          return value ? `[${value}]` : "";
        }
        return "";
      },
    });
  }

  return turndownService;
};

export const htmlToMarkdown = (html: string): string => {
  const service = getTurndownService();
  return service.turndown(html).trim();
};

export const elementToMarkdown = (element: Element): string => {
  const clonedElement = element.cloneNode(true);

  const service = getTurndownService();
  return service.turndown(clonedElement as HTMLElement).trim();
};
