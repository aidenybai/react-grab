import { cache } from "../core/cache.js";

export const NO_CAPTURE_TAGS = new Set(["meta", "script", "noscript", "title", "link", "template"]);

const NO_DEFAULTS_TAGS = new Set([
  "meta",
  "link",
  "style",
  "title",
  "noscript",
  "script",
  "template",
  "g",
  "defs",
  "use",
  "marker",
  "mask",
  "clipPath",
  "pattern",
  "path",
  "polygon",
  "polyline",
  "line",
  "circle",
  "ellipse",
  "rect",
  "filter",
  "lineargradient",
  "radialgradient",
  "stop",
]);

const commonTags = [
  "div",
  "span",
  "p",
  "a",
  "img",
  "ul",
  "li",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "main",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
];

export const precacheCommonTags = (): void => {
  for (const tag of commonTags) {
    const t = String(tag).toLowerCase();
    if (NO_CAPTURE_TAGS.has(t)) continue;
    if (NO_DEFAULTS_TAGS.has(t)) continue;
    getDefaultStyleForTag(t);
  }
};

const getDefaultStyleForTag = (tagName: string): Record<string, string> => {
  tagName = String(tagName).toLowerCase();

  if (NO_DEFAULTS_TAGS.has(tagName)) {
    const empty: Record<string, string> = {};
    cache.defaultStyle.set(tagName, empty);
    return empty;
  }

  if (cache.defaultStyle.has(tagName)) {
    return cache.defaultStyle.get(tagName)!;
  }

  let sandbox = document.getElementById("snapshot-sandbox");
  if (!sandbox) {
    sandbox = document.createElement("div");
    sandbox.id = "snapshot-sandbox";
    sandbox.setAttribute("data-snapshot-sandbox", "true");
    sandbox.setAttribute("aria-hidden", "true");
    sandbox.style.position = "absolute";
    sandbox.style.left = "-9999px";
    sandbox.style.top = "-9999px";
    sandbox.style.width = "0px";
    sandbox.style.height = "0px";
    sandbox.style.overflow = "hidden";
    document.body.appendChild(sandbox);
  }

  const el = document.createElement(tagName);
  el.style.all = "initial";
  sandbox.appendChild(el);

  const styles = getComputedStyle(el);
  const defaults: Record<string, string> = {};
  for (const prop of styles) {
    if (shouldIgnoreProp(prop)) continue;
    const value = styles.getPropertyValue(prop);
    defaults[prop] = value;
  }

  sandbox.removeChild(el);
  cache.defaultStyle.set(tagName, defaults);
  return defaults;
};

const NO_PAINT_TOKEN = /(?:^|-)(animation|transition)(?:-|$)/i;

const NO_PAINT_PREFIX =
  /^(--.+|view-timeline|scroll-timeline|animation-trigger|offset-|position-try|app-region|interactivity|overlay|view-transition|-webkit-locale|-webkit-user-(?:drag|modify)|-webkit-tap-highlight-color|-webkit-text-security)$/i;

const NO_PAINT_EXACT = new Set([
  "cursor",
  "pointer-events",
  "touch-action",
  "user-select",
  "print-color-adjust",
  "speak",
  "reading-flow",
  "reading-order",
  "anchor-name",
  "anchor-scope",
  "container-name",
  "container-type",
  "timeline-scope",
  "zoom",
]);

export const shouldIgnoreProp = (prop: string): boolean => {
  const p = String(prop).toLowerCase();
  if (NO_PAINT_EXACT.has(p)) return true;
  if (NO_PAINT_PREFIX.test(p)) return true;
  if (NO_PAINT_TOKEN.test(p)) return true;
  return false;
};

export const getStyleKey = (snapshot: Record<string, string>, tagName: string): string => {
  tagName = String(tagName || "").toLowerCase();
  if (NO_DEFAULTS_TAGS.has(tagName)) {
    return "";
  }

  const entries: string[] = [];
  const defaults = getDefaultStyleForTag(tagName);
  const display = (snapshot.display || "").toLowerCase();
  const isInline = display === "inline";
  const INLINE_SIZED_TAGS = new Set([
    "span",
    "small",
    "em",
    "strong",
    "b",
    "i",
    "u",
    "s",
    "code",
    "cite",
    "mark",
    "sub",
    "sup",
  ]);
  const TABLE_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr", "td", "th"]);
  const skipWidth = isInline || INLINE_SIZED_TAGS.has(tagName) || TABLE_TAGS.has(tagName);
  const isWidthProp = (p: string): boolean =>
    p === "width" ||
    p === "min-width" ||
    p === "max-width" ||
    p === "inline-size" ||
    p === "min-inline-size" ||
    p === "max-inline-size";
  for (const [prop, value] of Object.entries(snapshot)) {
    if (shouldIgnoreProp(prop)) continue;
    if (skipWidth && isWidthProp(prop)) continue;
    const def = defaults[prop];
    if (value && value !== def) entries.push(`${prop}:${value}`);
  }
  entries.sort();
  return entries.join(";");
};

export const collectUsedTagNames = (root: Node): string[] => {
  const tagSet = new Set<string>();
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return [];
  }
  const elementLike = root as Element;
  if (elementLike.tagName) {
    tagSet.add(elementLike.tagName.toLowerCase());
  }
  if (typeof elementLike.querySelectorAll === "function") {
    elementLike.querySelectorAll("*").forEach((el) => tagSet.add(el.tagName.toLowerCase()));
  }
  return Array.from(tagSet);
};

export const generateDedupedBaseCSS = (usedTagNames: string[]): string => {
  const groups = new Map<string, string[]>();

  for (const tagName of usedTagNames) {
    const styles = cache.defaultStyle.get(tagName);
    if (!styles) continue;

    const key = Object.entries(styles)
      .map(([k, v]) => `${k}:${v};`)
      .sort()
      .join("");

    if (!key) continue;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tagName);
  }

  let css = "";
  for (const [styleBlock, tagList] of groups.entries()) {
    css += `${tagList.join(",")} { ${styleBlock} }\n`;
  }

  return css;
};

export const generateCSSClasses = (styleMap: Map<unknown, string>): Map<string, string> => {
  const keys = Array.from(new Set(styleMap.values())).filter(Boolean).sort();
  const classMap = new Map<string, string>();
  let i = 1;
  for (const k of keys) classMap.set(k, `c${i++}`);
  return classMap;
};

const getWindowForElement = (el: Element): Window | null => {
  try {
    const doc = el?.ownerDocument;
    if (!doc) return typeof window !== "undefined" ? window : null;
    const win = doc.defaultView;
    if (win && typeof win.getComputedStyle === "function") return win;
    if (typeof window !== "undefined" && window.frames) {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          if (window.frames[i]?.document === doc) return window.frames[i];
        } catch {}
      }
    }
  } catch {}
  return typeof window !== "undefined" ? window : null;
};

export const getStyle = (el: Element, pseudo: string | null = null): CSSStyleDeclaration => {
  const emptyStyle = (): CSSStyleDeclaration => {
    const base: {
      length: number;
      getPropertyValue: () => string;
      item: () => string;
      [Symbol.iterator]?: () => Generator<string>;
    } = {
      length: 0,
      getPropertyValue: () => "",
      item: () => "",
    };
    base[Symbol.iterator] = function* (): Generator<string> {};
    return base as unknown as CSSStyleDeclaration;
  };

  if (!(el instanceof Element)) {
    const win = typeof window !== "undefined" ? window : null;
    if (win && typeof win.getComputedStyle === "function") {
      try {
        return win.getComputedStyle(el as Element, pseudo) || emptyStyle();
      } catch {
        return emptyStyle();
      }
    }
    return emptyStyle();
  }
  let map = cache.computedStyle.get(el);
  if (!map) {
    map = new Map();
    cache.computedStyle.set(el, map);
  }

  let style = map.get(pseudo);

  if (!style) {
    const win = getWindowForElement(el);
    let st: CSSStyleDeclaration | null = null;
    try {
      st =
        win && typeof win.getComputedStyle === "function" ? win.getComputedStyle(el, pseudo) : null;
    } catch {}

    if (!st && typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      try {
        if (el.ownerDocument === document) {
          st = window.getComputedStyle(el, pseudo);
        }
      } catch {}
    }

    style = st || emptyStyle();
    map.set(pseudo, style);
  }

  return style;
};

const BORDER_SIDES = ["top", "right", "bottom", "left"];

export const snapshotComputedStyle = (style: CSSStyleDeclaration): Record<string, string> => {
  const snap: Record<string, string> = {};
  for (const prop of style) {
    snap[prop] = style.getPropertyValue(prop);
  }
  for (const side of BORDER_SIDES) {
    const sty = snap[`border-${side}-style`];
    const wid = snap[`border-${side}-width`];
    if (sty === "none" || sty === "hidden" || wid === "0px") {
      delete snap[`border-${side}-style`];
      delete snap[`border-${side}-width`];
      delete snap[`border-${side}-color`];
    }
  }
  return snap;
};

export const splitBackgroundImage = (bg: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let lastIndex = 0;
  for (let i = 0; i < bg.length; i++) {
    const char = bg[i];
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(bg.slice(lastIndex, i).trim());
      lastIndex = i + 1;
    }
  }
  parts.push(bg.slice(lastIndex).trim());
  return parts;
};
