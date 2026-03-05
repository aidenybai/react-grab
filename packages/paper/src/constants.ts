export const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "LINK",
  "META",
  "HEAD",
  "IFRAME",
  "OBJECT",
  "EMBED",
]);

export const TAG_LABELS: Record<string, string> = {
  H1: "Heading 1",
  H2: "Heading 2",
  H3: "Heading 3",
  H4: "Heading 4",
  H5: "Heading 5",
  H6: "Heading 6",
  P: "Paragraph",
  BUTTON: "Button",
  A: "Link",
  IMG: "Image",
  NAV: "Navigation",
  HEADER: "Header",
  FOOTER: "Footer",
  MAIN: "Main",
  SECTION: "Section",
  ARTICLE: "Article",
  ASIDE: "Aside",
  UL: "List",
  OL: "List",
  LI: "List Item",
  FORM: "Form",
  INPUT: "Input",
  TEXTAREA: "Textarea",
  SELECT: "Select",
  TABLE: "Table",
  VIDEO: "Video",
  FIGURE: "Figure",
  FIGCAPTION: "Caption",
  BLOCKQUOTE: "Quote",
};

export const INLINE_DISPLAY_VALUES = new Set([
  "inline",
  "inline-block",
  "inline-flex",
]);

export const SHORT_TEXT_THRESHOLD_CHARS = 60;
export const DEFAULT_MAX_DEPTH = 50;
export const UNIQUE_ID_LENGTH = 26;

export const UTILITY_CLASS_PATTERN =
  /^(flex|grid|p[xytrbl]?-|m[xytrbl]?-|w-|h-|bg-|text-|border-|rounded|shadow|opacity-|gap-|space-|font-|leading-|tracking-|overflow-|z-|relative|absolute|fixed|sticky|hidden|block|inline|sr-only|col-|row-|items-|justify-|self-|order-|grow|shrink|basis-)/;
