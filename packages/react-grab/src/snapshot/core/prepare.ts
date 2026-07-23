import { generateCSSClasses, stripTranslate, debugWarn, getStyle } from "../utils/index.js";
import { deepClone } from "./clone.js";
import { inlinePseudoElements } from "../modules/pseudo.js";
import { inlineExternalDefsAndSymbols } from "../modules/svg-defs.js";
import { cache } from "../core/cache.js";
import { freezeSticky } from "../modules/change-css.js";
import { resolveBlobUrlsInTree } from "../utils/clone-helpers.js";
import { stabilizeLayout, forceContentVisibility } from "../utils/prepare-helpers.js";
import type { SnapshotCaptureContext } from "../types.js";

interface SnapshotPrepareResult {
  clone: HTMLElement;
  classCSS: string;
  styleCache: WeakMap<Element, CSSStyleDeclaration>;
}

export const prepareClone = async (
  element: Element,
  options: SnapshotCaptureContext = {},
): Promise<SnapshotPrepareResult> => {
  const sessionCache = {
    styleMap: cache.session.styleMap,
    styleCache: cache.session.styleCache,
    nodeMap: cache.session.nodeMap,
    options,
  };

  let clone!: HTMLElement;
  let classCSS = "";
  let shadowScopedCSS = "";

  stabilizeLayout(element);

  const undoContentVisibility = forceContentVisibility(element);

  try {
    clone = (await deepClone(element, sessionCache, options)) as HTMLElement;
  } catch (e) {
    console.warn("deepClone failed:", e);
    throw e;
  } finally {
    undoContentVisibility();
  }

  try {
    inlineExternalDefsAndSymbols(clone);
  } catch (e) {
    console.warn("inlineExternal defs or symbol failed:", e);
  }
  try {
    await inlinePseudoElements(element, clone, sessionCache, options);
  } catch (e) {
    console.warn("inlinePseudoElements failed:", e);
  }
  await resolveBlobUrlsInTree(clone, sessionCache);
  try {
    const styleNodes = clone.querySelectorAll("style[data-sd]");
    for (const s of styleNodes) {
      shadowScopedCSS += s.textContent || "";
      s.remove();
    }
  } catch (e) {
    debugWarn(sessionCache, "Failed to extract shadow CSS from style[data-sd]", e);
  }

  const keyToClass = generateCSSClasses(sessionCache.styleMap);
  classCSS = Array.from(keyToClass.entries())
    .map(([key, className]) => `.${className}{${key}}`)
    .join("");

  const PSEUDO_SUPPRESS =
    "[data-snapshot-has-after]::after,[data-snapshot-has-before]::before{content:none!important;display:none!important}";
  classCSS = shadowScopedCSS + PSEUDO_SUPPRESS + classCSS;

  for (const [node, key] of sessionCache.styleMap.entries()) {
    if (node.tagName === "STYLE") continue;
    /* c8 ignore next 4 */
    if (node.getRootNode && node.getRootNode() instanceof ShadowRoot) {
      node.setAttribute("style", key.replace(/;/g, "; "));
      continue;
    }

    const className = keyToClass.get(key);
    if (className) node.classList.add(className);

    const styledNode = node as HTMLElement;
    const bgImage = styledNode.style?.backgroundImage;
    const hasIcon = styledNode.dataset?.snapshotHasIcon;
    if (bgImage && bgImage !== "none") styledNode.style.backgroundImage = bgImage;
    /* c8 ignore next 4 */
    if (hasIcon) {
      styledNode.style.verticalAlign = "middle";
      styledNode.style.display = "inline";
    }
  }

  for (const [cloneNode, originalNode] of sessionCache.nodeMap.entries()) {
    const scrollX = originalNode.scrollLeft;
    const scrollY = originalNode.scrollTop;
    const hasScroll = scrollX || scrollY;
    if (hasScroll && cloneNode instanceof HTMLElement) {
      cloneNode.style.overflow = "hidden";
      cloneNode.style.scrollbarWidth = "none";
      (cloneNode.style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle =
        "none";

      try {
        const positioned = cloneNode.querySelectorAll("*");
        for (const child of positioned) {
          if (!(child instanceof HTMLElement)) continue;
          const pos = child.style.position;
          if (pos === "fixed" || pos === "absolute") {
            const curTop = parseFloat(child.style.top) || 0;
            const curLeft = parseFloat(child.style.left) || 0;
            child.style.top = `${curTop + scrollY}px`;
            child.style.left = `${curLeft + scrollX}px`;
            if (pos === "fixed") child.style.position = "absolute";
          }
        }
      } catch {}

      const inner = document.createElement("div");
      inner.style.all = "unset";
      inner.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
      inner.style.willChange = "transform";
      inner.style.display = "inline-block";
      inner.style.width = "100%";
      while (cloneNode.firstChild) {
        inner.appendChild(cloneNode.firstChild);
      }
      cloneNode.appendChild(inner);
    }
  }
  const contentRoot =
    clone instanceof HTMLElement && clone.firstElementChild instanceof HTMLElement
      ? clone.firstElementChild
      : clone;

  freezeSticky(element as HTMLElement, contentRoot);

  if (element === sessionCache.nodeMap.get(clone)) {
    const computed = sessionCache.styleCache.get(element) || getStyle(element);
    sessionCache.styleCache.set(element, computed);
    const transform = stripTranslate(computed.transform);
    clone.style.margin = "0";
    clone.style.top = "auto";
    clone.style.left = "auto";
    clone.style.right = "auto";
    clone.style.bottom = "auto";
    clone.style.animation = "none";
    clone.style.transition = "none";
    clone.style.willChange = "auto";
    clone.style.float = "none";
    clone.style.clear = "none";
    clone.style.transform = transform || "";
  }

  for (const [cloneNode, originalNode] of sessionCache.nodeMap.entries()) {
    if (originalNode.tagName === "PRE") {
      const preClone = cloneNode as HTMLElement;
      preClone.style.marginTop = "0";
      preClone.style.marginBlockStart = "0";
    }
  }
  return { clone, classCSS, styleCache: sessionCache.styleCache };
};
