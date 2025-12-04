import {
  createHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from "shiki";

const applyColorOverrides = (html: string): string => {
  return html.replace(/#99FFE4/gi, "#9f9f9f").replace(/#FFC799/gi, "#ffa0f3");
};

const removeBackground = (html: string): string => {
  return html.replace(/style="[^"]*background-color:[^;"]*;?[^"]*"/gi, (match) => {
    return match.replace(/background-color:[^;"]*;?/gi, '');
  }).replace(/style=""/g, '');
};

const injectLineNumbers = (html: string): string => {
  let lineNumber = 1;
  return html.replace(/<span class=("|')line\1>/g, () => {
    const current = lineNumber;
    lineNumber += 1;
    return `<span class="line"><span class="line-number" data-line="${current}"></span>`;
  });
};

let highlighterInstance: Highlighter | null = null;

const getHighlighter = async () => {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ["vesper"],
      langs: ["typescript", "javascript", "tsx", "jsx", "html", "json"],
    });
  }
  return highlighterInstance;
};

const highlightChangedLines = (html: string, changedLines?: number[]): string => {
  if (!changedLines || changedLines.length === 0) return html;

  let lineNumber = 0;
  return html.replace(/<span class=("|')line\1>/g, (match) => {
    lineNumber += 1;
    if (changedLines.includes(lineNumber)) {
      return `<span class="line line-changed">`;
    }
    return match;
  });
};

interface HighlightCodeOptions {
  code: string;
  lang: string;
  theme?: "vesper";
  showLineNumbers?: boolean;
  changedLines?: number[];
}

export const highlightCode = async ({
  code,
  lang,
  theme = "vesper",
  showLineNumbers = false,
  changedLines,
}: HighlightCodeOptions): Promise<string> => {
  const highlighter = await getHighlighter();
  const options: CodeToHastOptions = { lang, theme };
  let html = await highlighter.codeToHtml(code, options);
  html = applyColorOverrides(html);
  html = removeBackground(html);
  if (showLineNumbers) {
    html = injectLineNumbers(html);
  }
  html = highlightChangedLines(html, changedLines);
  return html;
};
