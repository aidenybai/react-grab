import { debugWarn } from "./index.js";
import type { SnapshotCaptureContext } from "../types.js";

export const stripRootShadows = (
  originalEl: Element,
  cloneRoot: HTMLElement,
  opts: SnapshotCaptureContext = {},
): void => {
  if (!originalEl || !cloneRoot || !cloneRoot.style) return;
  const cs = getComputedStyle(originalEl);
  try {
    cloneRoot.style.boxShadow = "none";
  } catch (e) {
    debugWarn(opts, "stripRootShadows boxShadow", e);
  }
  try {
    cloneRoot.style.textShadow = "none";
  } catch (e) {
    debugWarn(opts, "stripRootShadows textShadow", e);
  }
  try {
    cloneRoot.style.outline = "none";
  } catch (e) {
    debugWarn(opts, "stripRootShadows outline", e);
  }
  const f = cs.filter || "";
  const cleaned = f
    .replace(/\bblur\([^()]*\)\s*/gi, "")
    .replace(/\bdrop-shadow\([^()]*\)\s*/gi, "")
    .trim()
    .replace(/\s+/g, " ");
  try {
    cloneRoot.style.filter = cleaned.length ? cleaned : "none";
  } catch (e) {
    debugWarn(opts, "stripRootShadows filter", e);
  }
};

const establishesBFC = (cs: CSSStyleDeclaration): boolean => {
  const disp = cs.display || "";
  if (
    disp.includes("flex") ||
    disp.includes("grid") ||
    disp.startsWith("table") ||
    disp === "inline-block" ||
    disp === "flow-root"
  )
    return true;
  if (cs.position === "absolute" || cs.position === "fixed") return true;
  if (cs.float && cs.float !== "none") return true;
  const ox = cs.overflowX || cs.overflow || "visible";
  const oy = cs.overflowY || cs.overflow || "visible";
  if (ox !== "visible" || oy !== "visible") return true;
  if (cs.contain && /\b(layout|content|paint|strict)\b/.test(cs.contain)) return true;
  return false;
};

const firstInFlowBlockChild = (el: Element, side: "top" | "bottom"): Element | null => {
  const kids = Array.from(el.childNodes);
  const ordered = side === "top" ? kids : kids.reverse();
  for (const n of ordered) {
    if (n.nodeType === Node.TEXT_NODE) {
      if (/\S/.test(n.textContent || "")) return null;
      continue;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) continue;
    const element = n as Element;
    const cs = getComputedStyle(element);
    const disp = String(cs.display || "");
    if (disp === "none" || disp === "contents") continue;
    if (cs.position === "absolute" || cs.position === "fixed") continue;
    if (cs.float && cs.float !== "none") return null;
    if (disp.startsWith("inline")) return null;
    return element;
  }
  return null;
};

export const neutralizeRootMarginCollapse = (originalEl: Element, cloneRoot: HTMLElement): void => {
  if (!originalEl || !cloneRoot || !cloneRoot.style) return;
  const rootCS = getComputedStyle(originalEl);
  if (establishesBFC(rootCS)) return;

  for (const side of ["top", "bottom"] as const) {
    const Side = side === "top" ? "Top" : "Bottom";
    const rootStyle = rootCS as unknown as Record<string, string>;
    if ((parseFloat(rootStyle[`border${Side}Width`]) || 0) > 0) continue;
    if ((parseFloat(rootStyle[`padding${Side}`]) || 0) > 0) continue;

    let src: Element | null = originalEl;
    let cln: HTMLElement | null | undefined = cloneRoot;
    while (src && cln) {
      const childSrc = firstInFlowBlockChild(src, side);
      if (!childSrc) break;
      const idx = Array.from(src.children).indexOf(childSrc);
      const childCln: HTMLElement | null | undefined =
        idx >= 0 ? (cln.children[idx] as HTMLElement | undefined) : null;
      const childCS = getComputedStyle(childSrc);
      const childStyle = childCS as unknown as Record<string, string>;
      const m = parseFloat(childStyle[`margin${Side}`]) || 0;
      if (childCln && childCln.style && m > 0) {
        (childCln.style as unknown as Record<string, string>)[`margin${Side}`] = "0px";
      }
      if (establishesBFC(childCS)) break;
      if ((parseFloat(childStyle[`border${Side}Width`]) || 0) > 0) break;
      if ((parseFloat(childStyle[`padding${Side}`]) || 0) > 0) break;
      src = childSrc;
      cln = childCln;
    }
  }
};

const removeAllComments = (root: Node): void => {
  const it = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const toRemove: ChildNode[] = [];
  while (it.nextNode()) toRemove.push(it.currentNode as ChildNode);
  for (const n of toRemove) n.remove();
};

const sanitizeAttributesForXHTML = (
  root: Node,
  opts: { stripFrameworkDirectives?: boolean } = {},
): void => {
  const { stripFrameworkDirectives = true } = opts;
  const ALLOWED_PREFIXES = new Set(["xml", "xlink"]);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;

      if (name.includes("@")) {
        el.removeAttribute(name);
        continue;
      }

      if (name.includes(":")) {
        const prefix = name.split(":", 1)[0];
        if (!ALLOWED_PREFIXES.has(prefix)) {
          el.removeAttribute(name);
          continue;
        }
      }

      if (!stripFrameworkDirectives) continue;

      if (
        name.startsWith("x-") ||
        name.startsWith("v-") ||
        name.startsWith(":") ||
        name.startsWith("on:") ||
        name.startsWith("bind:") ||
        name.startsWith("let:") ||
        name.startsWith("class:")
      ) {
        el.removeAttribute(name);
        continue;
      }
    }
  }
};

/* eslint-disable no-control-regex */
const INVALID_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/g;
/* eslint-enable no-control-regex */

const stripInvalidXMLChars = (root: Element): void => {
  if (!root) return;
  const clean = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.attributes) {
        for (const attr of Array.from(element.attributes)) {
          const cv = attr.value.replace(INVALID_XML_CHARS, "");
          if (cv !== attr.value) {
            try {
              element.setAttribute(attr.name, cv);
            } catch {}
          }
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      const charData = node as CharacterData;
      const cv = charData.data.replace(INVALID_XML_CHARS, "");
      if (cv !== charData.data) charData.data = cv;
    }
  };
  clean(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) clean(n);
};

export const sanitizeCloneForXHTML = (
  root: Element,
  opts: { stripFrameworkDirectives?: boolean } = {},
): void => {
  if (!root) return;
  sanitizeAttributesForXHTML(root, opts);
  removeAllComments(root);
  stripInvalidXMLChars(root);
};

const authorHasExplicitSize = (el: Element): boolean => {
  try {
    const s = el.getAttribute?.("style") || "";
    return /\b(height|width|block-size|inline-size)\s*:/.test(s);
  } catch {
    return false;
  }
};

const isReplacedElement = (el: Element): boolean => {
  return (
    el instanceof HTMLImageElement ||
    el instanceof HTMLCanvasElement ||
    el instanceof HTMLVideoElement ||
    el instanceof HTMLIFrameElement ||
    el instanceof SVGElement ||
    el instanceof HTMLObjectElement ||
    el instanceof HTMLEmbedElement
  );
};

const shouldShrinkBox = (srcEl: Element, cs: CSSStyleDeclaration): boolean => {
  if (!(srcEl instanceof Element)) return false;
  if (authorHasExplicitSize(srcEl)) return false;
  if (isReplacedElement(srcEl)) return false;

  const pos = cs.position;
  if (pos === "absolute" || pos === "fixed" || pos === "sticky") return false;

  const disp = cs.display || "";
  if (disp.includes("flex") || disp.includes("grid") || disp.startsWith("table")) return false;

  if (cs.transform && cs.transform !== "none") return false;

  return true;
};

interface ElementStyleCache {
  get: (key: Element) => CSSStyleDeclaration | undefined;
  has: (key: Element) => boolean;
  set: (key: Element, value: CSSStyleDeclaration) => unknown;
}

export const shrinkAutoSizeBoxes = (
  sourceRoot: Element,
  cloneRoot: HTMLElement,
  styleCache: ElementStyleCache = new Map(),
): void => {
  const walk = (src: Element, cln: Element): void => {
    if (!(src instanceof Element) || !(cln instanceof Element)) return;

    const lostKids = src.childElementCount > cln.childElementCount;

    const cs = styleCache.get(src) || getComputedStyle(src);
    if (!styleCache.has(src)) styleCache.set(src, cs);

    if (lostKids && shouldShrinkBox(src, cs)) {
      const cloneStyle = (cln as HTMLElement).style;
      if (!cloneStyle.height) cloneStyle.height = "auto";
      if (!cloneStyle.width) cloneStyle.width = "auto";

      cloneStyle.removeProperty("block-size");
      cloneStyle.removeProperty("inline-size");

      if (!cloneStyle.minHeight) cloneStyle.minHeight = "0";
      if (!cloneStyle.minWidth) cloneStyle.minWidth = "0";
      if (!cloneStyle.maxHeight) cloneStyle.maxHeight = "none";
      if (!cloneStyle.maxWidth) cloneStyle.maxWidth = "none";

      const oy = cs.overflowY || cs.overflowBlock || "visible";
      const ox = cs.overflowX || cs.overflowInline || "visible";
      if (oy !== "visible" || ox !== "visible") {
        cloneStyle.overflow = "visible";
      }
    }

    const sKids = Array.from(src.children);
    const cKids = Array.from(cln.children);
    for (let i = 0; i < Math.min(sKids.length, cKids.length); i++) {
      walk(sKids[i], cKids[i]);
    }
  };

  walk(sourceRoot, cloneRoot);
};

const contributesToParentHeight = (el: Element): boolean => {
  const cs = getComputedStyle(el);
  if (cs.display === "none") return false;
  if (cs.position === "absolute" || cs.position === "fixed") return false;
  return true;
};

const willBeExcluded = (el: Element, options: SnapshotCaptureContext): boolean => {
  if (!(el instanceof Element)) return false;
  if (el.getAttribute("data-capture") === "exclude" && options?.excludeMode === "remove")
    return true;
  if (Array.isArray(options?.exclude)) {
    for (const sel of options.exclude) {
      try {
        if (el.matches(sel)) return options.excludeMode === "remove";
      } catch (e) {
        debugWarn(options, "exclude selector match failed", e);
      }
    }
  }
  return false;
};

export const estimateKeptHeight = (container: Element, options: SnapshotCaptureContext): number => {
  const csC = getComputedStyle(container);
  const rC = container.getBoundingClientRect();

  let minTop = Infinity;
  let maxBottom = -Infinity;
  let found = false;

  const kids = Array.from(container.children);
  for (const k of kids) {
    if (willBeExcluded(k, options)) continue;
    if (!contributesToParentHeight(k)) continue;
    const rk = k.getBoundingClientRect();
    const top = rk.top - rC.top;
    const bottom = rk.bottom - rC.top;
    if (bottom <= top) continue;
    if (top < minTop) minTop = top;
    if (bottom > maxBottom) maxBottom = bottom;
    found = true;
  }

  const contentSpan = found ? Math.max(0, maxBottom - minTop) : 0;

  const bt = parseFloat(csC.borderTopWidth) || 0;
  const bb = parseFloat(csC.borderBottomWidth) || 0;
  const pt = parseFloat(csC.paddingTop) || 0;
  const pb = parseFloat(csC.paddingBottom) || 0;

  return bt + bb + pt + pb + contentSpan;
};

export const limitDecimals = (v: number, n = 3): number =>
  Number.isFinite(v) ? Math.round(v * 10 ** n) / 10 ** n : v;

const SCROLLBAR_PSEUDO = /::-webkit-scrollbar(-[a-z]+)?\b/i;

const collectScrollbarRulesFromRules = (
  rules: CSSRuleList,
  seen: Set<string> = new Set(),
): string => {
  let out = "";
  if (!rules) return out;
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    try {
      const importRule = rule as CSSImportRule;
      if (rule.type === CSSRule.IMPORT_RULE && importRule.styleSheet) {
        out += collectScrollbarRulesFromRules(importRule.styleSheet.cssRules, seen);
        continue;
      }
      const mediaRule = rule as CSSMediaRule;
      if (rule.type === CSSRule.MEDIA_RULE && mediaRule.cssRules) {
        const inner = collectScrollbarRulesFromRules(mediaRule.cssRules, seen);
        if (inner) out += `@media ${mediaRule.conditionText}{${inner}}`;
        continue;
      }
      if (rule.type === CSSRule.STYLE_RULE) {
        const sel = (rule as CSSStyleRule).selectorText || "";
        if (SCROLLBAR_PSEUDO.test(sel)) {
          const text = rule.cssText;
          if (text && !seen.has(text)) {
            seen.add(text);
            out += text;
          }
        }
      }
    } catch {}
  }
  return out;
};

export const collectScrollbarCSS = (doc: Document): string => {
  if (!doc || !doc.styleSheets) return "";
  const seen = new Set<string>();
  let out = "";
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (rules) out += collectScrollbarRulesFromRules(rules, seen);
    } catch {}
  }
  return out;
};
