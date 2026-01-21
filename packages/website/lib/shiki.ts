import {
  createHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from "shiki";

const SHIKI_COLOR_OVERRIDES: Record<string, string> = {
  "#99FFE4": "#9f9f9f",
  "#FFC799": "#ffa0f3",
};

const LINE_SPAN_REGEX = /<span class=("|')line\1>/g;

const applyColorOverrides = (html: string): string => {
  return Object.entries(SHIKI_COLOR_OVERRIDES).reduce(
    (result, [from, to]) => result.replace(new RegExp(from, "gi"), to),
    html,
  );
};

const removeBackground = (html: string): string => {
  return html
    .replace(/style="[^"]*background-color:[^;"]*;?[^"]*"/gi, (match) => {
      return match.replace(/background-color:[^;"]*;?/gi, "");
    })
    .replace(/style=""/g, "");
};

const injectLineNumbers = (html: string): string => {
  let lineNumber = 1;
  return html.replace(LINE_SPAN_REGEX, () => {
    const current = lineNumber;
    lineNumber += 1;
    return `<span class="line"><span class="line-number" data-line="${current}"></span>`;
  });
};

const globalForShiki = globalThis as unknown as {
  shikiHighlighter: Highlighter | undefined;
  shikiHighlighterPromise: Promise<Highlighter> | undefined;
};

const getHighlighter = async (): Promise<Highlighter> => {
  if (globalForShiki.shikiHighlighter) {
    return globalForShiki.shikiHighlighter;
  }

  if (globalForShiki.shikiHighlighterPromise) {
    return globalForShiki.shikiHighlighterPromise;
  }

  globalForShiki.shikiHighlighterPromise = createHighlighter({
    themes: ["vesper"],
    langs: ["typescript", "javascript", "tsx", "jsx", "html", "json", "bash"],
  }).then((highlighter) => {
    globalForShiki.shikiHighlighter = highlighter;
    return highlighter;
  });

  return globalForShiki.shikiHighlighterPromise;
};

const highlightChangedLines = (
  html: string,
  changedLines?: number[],
): string => {
  if (!changedLines?.length) return html;

  const changedLinesSet = new Set(changedLines);
  let lineNumber = 0;
  return html.replace(LINE_SPAN_REGEX, (match) => {
    lineNumber += 1;
    return changedLinesSet.has(lineNumber)
      ? `<span class="line line-changed">`
      : match;
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
