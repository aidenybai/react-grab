import type { FileContents } from "@pierre/diffs";

export interface CodeFileOptions {
  code: string;
  lang?: string;
  filename?: string;
}

export const createFileContents = ({
  code,
  lang,
  filename,
}: CodeFileOptions): FileContents => {
  const extension = lang ? `.${lang}` : ".tsx";
  const name = filename ?? `code${extension}`;

  return {
    name,
    contents: code,
    ...(lang && { lang: lang as FileContents["lang"] }),
  };
};

export const DIFFS_THEME = "pierre-dark" as const;

export const DIFFS_OPTIONS = {
  theme: DIFFS_THEME,
  showHeader: false,
} as const;
