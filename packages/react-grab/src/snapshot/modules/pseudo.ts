import {
  getStyle,
  snapshotComputedStyle,
  extractURL,
  safeEncodeURI,
  inlineSingleBackgroundEntry,
  splitBackgroundImage,
  getStyleKey,
  debugWarn,
} from "../utils/index.js";
import { iconToImage } from "../modules/fonts.js";
import { isIconFont } from "../modules/icon-fonts.js";
import { buildCounterContext, resolveCountersInContent, hasCounters } from "../modules/counter.js";
import type { CounterContext } from "../modules/counter.js";
import { snapFetch } from "./snap-fetch.js";
import { cache } from "../core/cache.js";
import type { SnapshotCaptureContext, SnapshotSessionCache } from "../types.js";

interface PreflightMemo {
  fingerprint: string;
  result: boolean;
}

interface CounterDecl {
  name: string;
  num: number | undefined;
}

interface DerivedCounterContext extends CounterContext {
  __incs: CounterDecl[];
}

const __preflightMemo = new WeakMap<Document, PreflightMemo>();

const CSS_RULE_SCAN_BUDGET = 1000;

const preflightWithFp = (
  doc: Document,
  sessionCache: SnapshotSessionCache | null | undefined,
): boolean => {
  const fp = styleFingerprint(doc);
  if (!sessionCache) return shouldProcessPseudos(doc, fp);
  if (sessionCache.__pseudoPreflightFp !== fp) {
    sessionCache.__pseudoPreflight = shouldProcessPseudos(doc, fp);
    sessionCache.__pseudoPreflightFp = fp;
  }
  return Boolean(sessionCache.__pseudoPreflight);
};
const safeRules = (sheet: CSSStyleSheet): CSSRuleList | null => {
  try {
    return sheet && sheet.cssRules ? sheet.cssRules : null;
  } catch {
    return null;
  }
};

const styleFingerprint = (doc: Document): string => {
  const nodes = doc.querySelectorAll('style,link[rel~="stylesheet"]');
  let fp = `n:${nodes.length}|`;
  let totalRules = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.tagName === "STYLE") {
      const len = n.textContent ? n.textContent.length : 0;
      fp += `S${len}|`;
      const sheet = (n as HTMLStyleElement).sheet;
      const rules = sheet ? safeRules(sheet) : null;
      if (rules) totalRules += rules.length;
    } else {
      const href = n.getAttribute("href") || "";
      const media = n.getAttribute("media") || "all";
      fp += `L${href}|m:${media}|`;
      const sheet = (n as HTMLLinkElement).sheet;
      const rules = sheet ? safeRules(sheet) : null;
      if (rules) totalRules += rules.length;
    }
  }

  const ass = doc.adoptedStyleSheets;
  fp += `ass:${Array.isArray(ass) ? ass.length : 0}|tr:${totalRules}`;

  return fp;
};

const sheetHasNeedles = (
  sheet: CSSStyleSheet,
  needles: string[],
  state: { budget: number },
): boolean => {
  const rules = safeRules(sheet);
  if (!rules) return false;

  for (let i = 0; i < rules.length; i++) {
    if (state.budget <= 0) return false;
    const rule = rules[i];
    const css = rule && rule.cssText ? rule.cssText : "";
    state.budget--;
    for (const k of needles) {
      if (css.includes(k)) return true;
    }
    const grouping = rule as CSSGroupingRule;
    if (rule && grouping.cssRules && grouping.cssRules.length) {
      for (let j = 0; j < grouping.cssRules.length && state.budget > 0; j++) {
        const inner = grouping.cssRules[j];
        const innerCss = inner && inner.cssText ? inner.cssText : "";
        state.budget--;
        for (const k of needles) {
          if (innerCss.includes(k)) return true;
        }
      }
    }
    if (state.budget <= 0) return false;
  }
  return false;
};

export const shouldProcessPseudos = (
  doc: Document = document,
  fp: string = styleFingerprint(doc),
): boolean => {
  const memo = __preflightMemo.get(doc);
  if (memo && memo.fingerprint === fp) return memo.result;

  const NEEDLES = [
    "::before",
    "::after",
    "::first-letter",
    ":before",
    ":after",
    ":first-letter",
    "counter(",
    "counters(",
    "counter-increment",
    "counter-reset",
  ];

  const styleEls = doc.querySelectorAll("style");
  for (let i = 0; i < styleEls.length; i++) {
    const t = styleEls[i].textContent || "";
    for (const k of NEEDLES)
      if (t.includes(k)) {
        __preflightMemo.set(doc, { fingerprint: fp, result: true });
        return true;
      }
  }

  const ass = doc.adoptedStyleSheets;
  if (Array.isArray(ass) && ass.length) {
    const state = { budget: CSS_RULE_SCAN_BUDGET };
    try {
      for (const sheet of ass) {
        if (sheetHasNeedles(sheet, NEEDLES, state)) {
          __preflightMemo.set(doc, { fingerprint: fp, result: true });
          return true;
        }
      }
    } catch {}
  }

  {
    const nodes = doc.querySelectorAll('style,link[rel~="stylesheet"]');
    const state = { budget: CSS_RULE_SCAN_BUDGET };
    for (let i = 0; i < nodes.length && state.budget > 0; i++) {
      const n = nodes[i];
      let sheet: CSSStyleSheet | null = null;
      if (n.tagName === "STYLE") {
        sheet = (n as HTMLStyleElement).sheet || null;
      } else {
        sheet = (n as HTMLLinkElement).sheet || null;
      }
      if (sheet && sheetHasNeedles(sheet, NEEDLES, state)) {
        __preflightMemo.set(doc, { fingerprint: fp, result: true });
        return true;
      }
    }
  }

  if (doc.querySelector('[style*="counter("], [style*="counters("]')) {
    __preflightMemo.set(doc, { fingerprint: fp, result: true });
    return true;
  }

  __preflightMemo.set(doc, { fingerprint: fp, result: false });
  return false;
};

let __siblingCounters = new WeakMap<Element, Map<string, number>>();

const hasPaintedBorder = (style: CSSStyleDeclaration): boolean => {
  const sides = ["Top", "Right", "Bottom", "Left"] as const;
  for (const side of sides) {
    const w = parseFloat(style[`border${side}Width`]) || 0;
    const s = style[`border${side}Style`];
    if (w > 0 && s && s !== "none" && s !== "hidden") return true;
  }
  return false;
};
let __pseudoEpoch = -1;

const collapseCssContent = (raw: string): string => {
  if (!raw) return "";
  const parts: string[] = [];
  const rx = /"([^"]*)"/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw))) {
    const between = raw.slice(lastIndex, m.index).trim();
    if (between) parts.push(between);
    parts.push(m[1]);
    lastIndex = rx.lastIndex;
  }
  const tail = raw.slice(lastIndex).trim();
  if (tail) parts.push(tail);
  return parts.join("");
};

const withSiblingOverrides = (node: Element, base: CounterContext): CounterContext => {
  const parent = node.parentElement;
  const map = parent ? __siblingCounters.get(parent) : null;
  if (!map) return base;
  return {
    get(n: Element, name: string): number {
      const v = base.get(n, name);
      const ov = map.get(name);
      return typeof ov === "number" ? Math.max(v, ov) : v;
    },
    getStack(n: Element, name: string): number[] {
      const s = base.getStack(n, name);
      if (!s.length) return s;
      const ov = map.get(name);
      if (typeof ov === "number") {
        const out = s.slice();
        out[out.length - 1] = Math.max(out[out.length - 1], ov);
        return out;
      }
      return s;
    },
  };
};

const deriveCounterCtxForPseudo = (
  node: Element,
  pseudoStyle: CSSStyleDeclaration | null | undefined,
  baseCtx: CounterContext,
): DerivedCounterContext => {
  const modStacks = new Map<string, number[]>();

  const parseListDecl = (value: string | null | undefined): CounterDecl[] => {
    const out: CounterDecl[] = [];
    if (!value || value === "none") return out;
    for (const part of String(value).split(",")) {
      const toks = part.trim().split(/\s+/);
      const name = toks[0];
      const num = Number.isFinite(Number(toks[1])) ? Number(toks[1]) : undefined;
      if (name) out.push({ name, num });
    }
    return out;
  };

  const resets = parseListDecl(pseudoStyle?.counterReset);
  const sets = parseListDecl(pseudoStyle?.counterSet);
  const incs = parseListDecl(pseudoStyle?.counterIncrement);

  const getStackDerived = (name: string): number[] => {
    if (modStacks.has(name)) return modStacks.get(name)!.slice();
    let stack = baseCtx.getStack(node, name);
    stack = stack.length ? stack.slice() : [];

    const r = resets.find((x) => x.name === name);
    if (r) {
      const val = Number.isFinite(r.num) ? (r.num as number) : 0;
      stack = stack.length ? [...stack, val] : [val];
    }

    const s = sets.find((x) => x.name === name);
    if (s) {
      const val = Number.isFinite(s.num) ? (s.num as number) : 0;
      if (stack.length === 0) stack = [0];
      stack[stack.length - 1] = val;
    }

    const inc = incs.find((x) => x.name === name);
    if (inc) {
      const by = Number.isFinite(inc.num) ? (inc.num as number) : 1;
      if (stack.length === 0) stack = [0];
      stack[stack.length - 1] += by;
    }

    modStacks.set(name, stack.slice());
    return stack;
  };

  return {
    get(_node: Element, name: string): number {
      const s = getStackDerived(name);
      return s.length ? s[s.length - 1] : 0;
    },
    getStack(_node: Element, name: string): number[] {
      return getStackDerived(name);
    },
    __incs: incs,
  };
};

const resolvePseudoContentAndIncs = (
  node: Element,
  pseudo: string,
  baseCtx: CounterContext,
): { text: string; incs: CounterDecl[] } => {
  let ps: CSSStyleDeclaration | undefined;
  try {
    ps = getStyle(node, pseudo);
  } catch {}
  const raw = ps?.content;
  if (!raw || raw === "none" || raw === "normal") return { text: "", incs: [] };

  const baseWithSiblings = withSiblingOverrides(node, baseCtx);

  const derived = deriveCounterCtxForPseudo(node, ps, baseWithSiblings);

  const resolved = hasCounters(raw) ? resolveCountersInContent(raw, node, derived) : raw;

  const text = collapseCssContent(resolved);
  return { text, incs: derived.__incs || [] };
};

export const inlinePseudoElements = async (
  source: Element,
  clone: HTMLElement,
  sessionCache: SnapshotSessionCache,
  options: SnapshotCaptureContext,
): Promise<void> => {
  if (!(source instanceof Element) || !(clone instanceof Element)) return;
  const doc = source.ownerDocument || document;
  if (!preflightWithFp(doc, sessionCache)) {
    return;
  }

  const epoch = cache?.session?.__counterEpoch ?? 0;
  if (__pseudoEpoch !== epoch) {
    __siblingCounters = new WeakMap();
    if (sessionCache) sessionCache.__counterCtx = null;
    __pseudoEpoch = epoch;
  }

  if (!sessionCache.__counterCtx) {
    try {
      sessionCache.__counterCtx = buildCounterContext(source.ownerDocument || document);
    } catch (e) {
      debugWarn(sessionCache, "buildCounterContext failed", e);
    }
  }
  const counterCtx = sessionCache.__counterCtx!;

  for (const pseudo of ["::before", "::after", "::first-letter"]) {
    try {
      const style = getStyle(source, pseudo);
      if (!style) continue;
      const isEmptyPseudo =
        style.content === "none" &&
        style.backgroundImage === "none" &&
        style.backgroundColor === "transparent" &&
        !hasPaintedBorder(style) &&
        (!style.transform || style.transform === "none") &&
        style.display === "inline";

      if (isEmptyPseudo) continue;

      if (pseudo === "::first-letter") {
        const normal = getStyle(source);
        const disp = (normal?.display || "").toLowerCase();
        if (disp.includes("flex") || disp.includes("grid")) continue;
        const isMeaningful =
          style.color !== normal.color ||
          style.fontSize !== normal.fontSize ||
          style.fontWeight !== normal.fontWeight ||
          style.fontFamily !== normal.fontFamily ||
          style.fontStyle !== normal.fontStyle ||
          style.textTransform !== normal.textTransform ||
          style.float !== normal.float ||
          style.paddingTop !== normal.paddingTop ||
          style.paddingRight !== normal.paddingRight ||
          style.paddingBottom !== normal.paddingBottom ||
          style.paddingLeft !== normal.paddingLeft ||
          style.marginTop !== normal.marginTop ||
          style.marginRight !== normal.marginRight ||
          style.marginBottom !== normal.marginBottom ||
          style.marginLeft !== normal.marginLeft;
        if (!isMeaningful) continue;

        const textNode = Array.from(clone.childNodes).find(
          (n) => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim().length ?? 0) > 0,
        );
        if (!textNode) continue;

        const text = textNode.textContent ?? "";
        const match = text.match(/^([^\p{L}\p{N}\s]*[\p{L}\p{N}](?:['’])?)/u);
        const first = match?.[0];
        const rest = text.slice(first?.length || 0);
        if (!first || /[\uD800-\uDFFF]/.test(first)) continue;

        const span = document.createElement("span");
        span.textContent = first;
        span.dataset.snapshotPseudo = "::first-letter";
        const snapshot = snapshotComputedStyle(style);
        const key = getStyleKey(snapshot, "span");
        sessionCache.styleMap.set(span, key);

        const restNode = document.createTextNode(rest);
        clone.replaceChild(restNode, textNode);
        clone.insertBefore(span, restNode);
        continue;
      }

      const rawContent = style.content ?? "";
      const isNoExplicitContent =
        rawContent === "" || rawContent === "none" || rawContent === "normal";
      const { text: cleanContent, incs } = resolvePseudoContentAndIncs(source, pseudo, counterCtx);

      const bg = style.backgroundImage;
      const bgColor = style.backgroundColor;
      const fontFamily = style.fontFamily;
      const fontSize = parseInt(style.fontSize) || 32;
      const fontWeight = parseInt(style.fontWeight) || false;
      const color = style.color || "#000";
      const transform = style.transform;

      const isIconFont2 = isIconFont(fontFamily);

      const hasExplicitContent = !isNoExplicitContent && cleanContent !== "";
      const hasBg = bg && bg !== "none";
      const hasBgColor = bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)";
      const hasBorder = hasPaintedBorder(style);
      const hasTransform = transform && transform !== "none";

      const boxGenerating = rawContent !== "none" && rawContent !== "normal";
      const hasLayoutBox =
        boxGenerating &&
        ((parseFloat(style.width) || 0) > 0 || (parseFloat(style.height) || 0) > 0);

      const shouldRender =
        hasExplicitContent || hasBg || hasBgColor || hasBorder || hasTransform || hasLayoutBox;

      if (!shouldRender) {
        if (incs && incs.length && source.parentElement) {
          const map = __siblingCounters.get(source.parentElement) || new Map<string, number>();
          for (const { name } of incs) {
            if (!name) continue;
            const baseWithSibs = withSiblingOverrides(source, counterCtx);
            const derived = deriveCounterCtxForPseudo(
              source,
              getStyle(source, pseudo),
              baseWithSibs,
            );
            const finalVal = derived.get(source, name);
            map.set(name, finalVal);
          }
          __siblingCounters.set(source.parentElement, map);
        }
        continue;
      }

      let pinNowrap = false;
      if (
        hasExplicitContent &&
        !isIconFont2 &&
        cleanContent.length > 1 &&
        !cleanContent.startsWith("url(")
      ) {
        const hostStyle = getStyle(source);
        const fs = parseFloat(hostStyle.fontSize) || 16;
        let lh = parseFloat(hostStyle.lineHeight);
        if (!Number.isFinite(lh)) lh = fs * 1.5;
        const rect = source.getBoundingClientRect();
        if (rect.height < lh * 1.6) {
          clone.style.whiteSpace = "nowrap";
          pinNowrap = true;
        }
      }

      const pseudoEl = document.createElement("span");
      pseudoEl.dataset.snapshotPseudo = pseudo;
      pseudoEl.style.pointerEvents = "none";
      if (pinNowrap) pseudoEl.style.whiteSpace = "nowrap";
      const snapshot = snapshotComputedStyle(style);
      const key = getStyleKey(snapshot, "span");
      sessionCache.styleMap.set(pseudoEl, key);

      if (isIconFont2 && cleanContent && cleanContent.length === 1) {
        const {
          dataUrl,
          width: w,
          height: h,
        } = await iconToImage(
          cleanContent,
          fontFamily,
          fontWeight as string | number,
          fontSize,
          color,
        );
        const imgEl = document.createElement("img");
        imgEl.src = dataUrl;
        imgEl.style.cssText = `height:${fontSize}px;width:${(w / h) * fontSize}px;object-fit:contain;`;
        pseudoEl.appendChild(imgEl);
        clone.dataset.snapshotHasIcon = "true";
      } else if (cleanContent && cleanContent.startsWith("url(")) {
        const rawUrl = extractURL(cleanContent);
        if (rawUrl?.trim()) {
          try {
            const dataUrl = await snapFetch(safeEncodeURI(rawUrl), {
              as: "dataURL",
              useProxy: options.useProxy,
            });
            if (dataUrl?.ok && typeof dataUrl.data === "string") {
              const imgEl = document.createElement("img");
              imgEl.src = dataUrl.data;
              imgEl.style.cssText = `width:${fontSize}px;height:auto;object-fit:contain;`;
              pseudoEl.appendChild(imgEl);
            }
          } catch (e) {
            console.error(`[snapshot] Error in pseudo ${pseudo} for`, source, e);
          }
        }
      } else if (!isIconFont2 && hasExplicitContent) {
        pseudoEl.textContent = cleanContent;
      }

      pseudoEl.style.backgroundImage = "none";
      if ("maskImage" in pseudoEl.style) pseudoEl.style.maskImage = "none";
      if ("webkitMaskImage" in pseudoEl.style) pseudoEl.style.webkitMaskImage = "none";

      try {
        pseudoEl.style.backgroundRepeat = style.backgroundRepeat;
        pseudoEl.style.backgroundSize = style.backgroundSize;
        if (style.backgroundPositionX && style.backgroundPositionY) {
          pseudoEl.style.backgroundPositionX = style.backgroundPositionX;
          pseudoEl.style.backgroundPositionY = style.backgroundPositionY;
        } else {
          pseudoEl.style.backgroundPosition = style.backgroundPosition;
        }
        pseudoEl.style.backgroundOrigin = style.backgroundOrigin;
        pseudoEl.style.backgroundClip = style.backgroundClip;
        pseudoEl.style.backgroundAttachment = style.backgroundAttachment;
        pseudoEl.style.backgroundBlendMode = style.backgroundBlendMode;
      } catch {}

      if (hasBg) {
        try {
          const bgSplits = splitBackgroundImage(bg);
          const newBgParts = await Promise.all(
            bgSplits.map((entry) => inlineSingleBackgroundEntry(entry)),
          );
          pseudoEl.style.backgroundImage = newBgParts.join(", ");
        } catch (e) {
          console.warn(`[snapshot] Failed to inline background-image for ${pseudo}`, e);
        }
      }
      if (hasBgColor) pseudoEl.style.backgroundColor = bgColor;

      const hasContent2 = pseudoEl.childNodes.length > 0 || pseudoEl.textContent?.trim() !== "";
      const hasVisibleBox =
        hasContent2 || hasBg || hasBgColor || hasBorder || hasTransform || hasLayoutBox;

      if (incs && incs.length && source.parentElement) {
        const map = __siblingCounters.get(source.parentElement) || new Map<string, number>();
        const baseWithSibs = withSiblingOverrides(source, counterCtx);
        const derived = deriveCounterCtxForPseudo(source, getStyle(source, pseudo), baseWithSibs);
        for (const { name } of incs) {
          if (!name) continue;
          const finalVal = derived.get(source, name);
          map.set(name, finalVal);
        }
        __siblingCounters.set(source.parentElement, map);
      }

      if (!hasVisibleBox) continue;

      if (pseudo === "::before") {
        clone.dataset.snapshotHasBefore = "1";
        clone.insertBefore(pseudoEl, clone.firstChild);
      } else {
        clone.dataset.snapshotHasAfter = "1";
        clone.appendChild(pseudoEl);
      }
    } catch (e) {
      console.warn(`[snapshot] Failed to capture ${pseudo} for`, source, e);
    }
  }

  const cChildren = (Array.from(clone.children) as HTMLElement[]).filter(
    (child) => !child.dataset.snapshotPseudo,
  );
  if (sessionCache.nodeMap) {
    for (const cChild of cChildren) {
      const sChild = sessionCache.nodeMap.get(cChild);
      if (sChild instanceof Element) {
        await inlinePseudoElements(sChild, cChild, sessionCache, options);
      }
    }
  } else {
    const sChildren = Array.from(source.children);
    for (let i = 0; i < Math.min(sChildren.length, cChildren.length); i++) {
      await inlinePseudoElements(sChildren[i], cChildren[i], sessionCache, options);
    }
  }
};
