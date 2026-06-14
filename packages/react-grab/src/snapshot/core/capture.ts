import { prepareClone } from "./prepare.js";
import { inlineImages } from "../modules/images.js";
import { inlineBackgroundImages } from "../modules/background.js";
import { ligatureIconToImage } from "../modules/icon-fonts.js";
import {
  idle,
  collectUsedTagNames,
  generateDedupedBaseCSS,
  isSafari,
  getStyle,
} from "../utils/index.js";
import {
  embedCustomFonts,
  collectUsedFontVariants,
  collectUsedCodepoints,
  ensureFontsReady,
} from "../modules/fonts.js";
import { cache, applyCachePolicy } from "../core/cache.js";
import { lineClampTree } from "../modules/line-clamp.js";
import { runHook, getGlobalPlugins, normalizePlugin } from "./plugins.js";
import { runPictureResolverBeforeClone } from "../modules/picture-resolver.js";
import {
  stripRootShadows,
  neutralizeRootMarginCollapse,
  sanitizeCloneForXHTML,
  shrinkAutoSizeBoxes,
  estimateKeptHeight,
  limitDecimals,
  collectScrollbarCSS,
} from "../utils/capture-helpers.js";
import {
  parseBoxShadow,
  parseFilterBlur,
  parseOutline,
  parseFilterDropShadows,
  normalizeRootTransforms,
  bboxWithOriginFull,
  parseTransformOriginPx,
  readIndividualTransforms,
  readTotalTransformMatrix,
  hasBBoxAffectingTransform,
} from "../utils/transforms-helpers.js";
import type { SnapshotCaptureContext, SnapshotPluginUse } from "../types.js";

interface CaptureState {
  element: Element;
  options: SnapshotCaptureContext;
  plugins?: SnapshotPluginUse[];
  clone?: HTMLElement;
  classCSS?: string;
  styleCache?: WeakMap<Element, CSSStyleDeclaration>;
  fontsCSS?: string;
  baseCSS?: string;
  scrollbarCSS?: string;
  svgString?: string;
  dataURL?: string;
  [key: string]: unknown;
}

const hasPictureResolverPlugin = (options: SnapshotCaptureContext): boolean => {
  if (Array.isArray(options.plugins)) {
    for (const d of options.plugins) {
      const inst = normalizePlugin(d);
      if (inst?.name === "picture-resolver") return true;
    }
  }
  return getGlobalPlugins().some((p) => p?.name === "picture-resolver");
};

export const captureDOM = async (
  element: Element,
  options: SnapshotCaptureContext,
): Promise<string> => {
  if (!element) throw new Error("Element cannot be null or undefined");
  applyCachePolicy(options.cache);
  const fast = options.fast;
  const outerTransforms = options.outerTransforms !== false;

  const outerShadows = Boolean(options.outerShadows);
  let state: CaptureState = { element, options, plugins: options.plugins };

  let clone!: HTMLElement;
  let classCSS!: string;
  let styleCache!: WeakMap<Element, CSSStyleDeclaration>;
  let fontsCSS = "";
  let baseCSS = "";
  let dataURL = "";
  let svgString = "";
  let rootTransform2D: { a: number; b?: number; c?: number; d?: number } | null = null;
  await runHook("beforeSnap", state);

  let undoPictureResolver: (() => Promise<void>) | null = null;
  if (options.resolvePicturePlaceholders !== false && !hasPictureResolverPlugin(options)) {
    undoPictureResolver = await runPictureResolverBeforeClone(state.element, state.options);
  }

  await runHook("beforeClone", state);
  const undoClamp = lineClampTree(state.element);
  try {
    ({ clone, classCSS, styleCache } = await prepareClone(state.element, state.options));

    if (!outerTransforms && clone) {
      rootTransform2D = normalizeRootTransforms(state.element, clone);
    }
    if (!outerShadows && clone) {
      stripRootShadows(state.element, clone, state.options);
    }
    if (clone) {
      neutralizeRootMarginCollapse(state.element, clone);
    }
  } finally {
    undoClamp();
  }

  state = { clone, classCSS, styleCache, ...state };
  await runHook("afterClone", state);
  if (undoPictureResolver) await undoPictureResolver();
  sanitizeCloneForXHTML(state.clone!);
  if (state.options?.excludeMode === "remove") {
    try {
      shrinkAutoSizeBoxes(state.element, state.clone!, state.styleCache!);
    } catch (e) {
      console.warn("[snapshot] shrink pass failed:", e);
    }
  }
  try {
    await ligatureIconToImage(state.clone!, state.element);
  } catch {}

  await new Promise<void>((resolve) => {
    idle(
      async () => {
        await inlineImages(state.clone!, state.options);
        resolve();
      },
      { fast },
    );
  });

  await new Promise<void>((resolve) => {
    idle(
      async () => {
        await inlineBackgroundImages(
          state.element as HTMLElement,
          state.clone!,
          state.styleCache!,
          state.options,
        );
        resolve();
      },
      { fast },
    );
  });

  if (options.embedFonts) {
    await new Promise<void>((resolve) => {
      idle(
        async () => {
          const required = collectUsedFontVariants(state.element);
          const usedCodepoints = collectUsedCodepoints(state.element);
          if (isSafari()) {
            const families = new Set(
              Array.from(required)
                .map((k) => String(k).split("__")[0])
                .filter(Boolean),
            );
            await ensureFontsReady(families, 1);
          }
          fontsCSS = await embedCustomFonts({
            required,
            usedCodepoints,
            exclude: state.options.excludeFonts,
            localFonts: state.options.localFonts,
            useProxy: state.options.useProxy,
            fontStylesheetDomains: state.options.fontStylesheetDomains as string[] | undefined,
          });
          resolve();
        },
        { fast },
      );
    });
  }

  const usedTags = collectUsedTagNames(state.clone!).sort();
  const tagKey = usedTags.join(",");
  if (cache.baseStyle.has(tagKey)) {
    baseCSS = cache.baseStyle.get(tagKey) ?? "";
  } else {
    await new Promise<void>((resolve) => {
      idle(
        () => {
          baseCSS = generateDedupedBaseCSS(usedTags);
          cache.baseStyle.set(tagKey, baseCSS);
          resolve();
        },
        { fast },
      );
    });
  }
  const scrollbarCSS = collectScrollbarCSS(state.element?.ownerDocument || document);
  state = { fontsCSS, baseCSS, scrollbarCSS, ...state };
  await runHook("beforeRender", state);

  await new Promise<void>((resolve) => {
    idle(
      () => {
        const csEl = getStyle(state.element);

        const rect = state.element.getBoundingClientRect();
        let w0 = Math.max(
          1,
          limitDecimals(
            (state.element as HTMLElement).offsetWidth || parseFloat(csEl.width) || rect.width || 1,
          ),
        );
        let h0 = Math.max(
          1,
          limitDecimals(
            (state.element as HTMLElement).offsetHeight ||
              parseFloat(csEl.height) ||
              rect.height ||
              1,
          ),
        );
        const elDoc = state.element.ownerDocument || document;
        const isRoot = state.element === elDoc.body || state.element === elDoc.documentElement;
        if (isRoot) {
          const docH = Math.max(
            state.element.scrollHeight || 0,
            elDoc.documentElement?.scrollHeight || 0,
            elDoc.body?.scrollHeight || 0,
          );
          const docW = Math.max(
            state.element.scrollWidth || 0,
            elDoc.documentElement?.scrollWidth || 0,
            elDoc.body?.scrollWidth || 0,
          );
          if (docH > 0) h0 = Math.max(h0, limitDecimals(docH));
          if (docW > 0) w0 = Math.max(w0, limitDecimals(docW));
          try {
            const cssLen =
              (state.scrollbarCSS || "").length +
              (state.baseCSS || "").length +
              (state.fontsCSS || "").length +
              (state.classCSS || "").length;
            const hint = cache.measureHints.get(state.element);
            if (hint && hint.cssLen === cssLen && hint.w0 === w0) {
              if (hint.csh > 0) h0 = Math.max(h0, limitDecimals(hint.csh));
              if (hint.csw > 0) w0 = Math.max(w0, limitDecimals(hint.csw));
            } else {
              const wrap = elDoc.createElement("div");
              wrap.style.cssText =
                "position:absolute!important;left:-9999px!important;top:0!important;width:" +
                w0 +
                "px!important;overflow:visible!important;visibility:hidden!important;";
              const styleNode = elDoc.createElement("style");
              styleNode.textContent =
                (state.scrollbarCSS || "") +
                state.baseCSS! +
                state.fontsCSS! +
                "svg{overflow:visible;} foreignObject{overflow:visible;}" +
                state.classCSS!;
              wrap.appendChild(styleNode);
              wrap.appendChild(state.clone!.cloneNode(true));
              elDoc.body.appendChild(wrap);
              const csh = wrap.scrollHeight;
              const csw = wrap.scrollWidth;
              elDoc.body.removeChild(wrap);
              cache.measureHints.set(state.element, { cssLen, w0, csh, csw });
              if (csh > 0) h0 = Math.max(h0, limitDecimals(csh));
              if (csw > 0) w0 = Math.max(w0, limitDecimals(csw));
            }
          } catch {}
        }
        if (state.options?.excludeMode === "remove") {
          const hEst = estimateKeptHeight(state.element, state.options);
          const EPS = 1;
          if (Number.isFinite(hEst) && hEst > 0) {
            h0 = Math.max(1, Math.min(h0, limitDecimals(hEst + EPS)));
          }
        }
        const coerceNum = (value: unknown, fallbackValue: number = NaN): number => {
          const parsed = typeof value === "string" ? parseFloat(value) : value;
          return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallbackValue;
        };

        const optW = coerceNum(state.options.width);
        const optH = coerceNum(state.options.height);
        let w = w0,
          h = h0;

        const hasW = Number.isFinite(optW);
        const hasH = Number.isFinite(optH);
        const aspect0 = h0 > 0 ? w0 / h0 : 1;

        if (hasW && hasH) {
          w = Math.max(1, limitDecimals(optW));
          h = Math.max(1, limitDecimals(optH));
        } else if (hasW) {
          w = Math.max(1, limitDecimals(optW));
          h = Math.max(1, limitDecimals(w / (aspect0 || 1)));
        } else if (hasH) {
          h = Math.max(1, limitDecimals(optH));
          w = Math.max(1, limitDecimals(h * (aspect0 || 1)));
        } else {
          w = w0;
          h = h0;
        }

        let minX = 0,
          minY = 0,
          maxX = w0,
          maxY = h0;

        if (!outerTransforms && rootTransform2D && Number.isFinite(rootTransform2D.a)) {
          const M2 = new DOMMatrix([
            rootTransform2D.a,
            rootTransform2D.b || 0,
            rootTransform2D.c || 0,
            rootTransform2D.d || 1,
            0,
            0,
          ]);
          const bb2 = bboxWithOriginFull(w0, h0, M2, 0, 0);
          minX = limitDecimals(bb2.minX);
          minY = limitDecimals(bb2.minY);
          maxX = limitDecimals(bb2.maxX);
          maxY = limitDecimals(bb2.maxY);
        } else {
          const useTFBBox = outerTransforms && hasTFBBox(state.element);
          if (useTFBBox) {
            const baseTransform2 =
              csEl.transform && csEl.transform !== "none" ? csEl.transform : "";
            const ind2 = readIndividualTransforms(state.element);
            const TOTAL = readTotalTransformMatrix({
              baseTransform: baseTransform2,
              rotate: ind2.rotate || "0deg",
              scale: ind2.scale,
              translate: ind2.translate,
            });
            const { ox: ox2, oy: oy2 } = parseTransformOriginPx(csEl, w0, h0);
            const M = TOTAL.is2D ? TOTAL : new DOMMatrix(TOTAL.toString());
            const bb = bboxWithOriginFull(w0, h0, M, ox2, oy2);
            minX = limitDecimals(bb.minX);
            minY = limitDecimals(bb.minY);
            maxX = limitDecimals(bb.maxX);
            maxY = limitDecimals(bb.maxY);
          }
        }

        const bleedShadow = parseBoxShadow(csEl);
        const bleedBlur = parseFilterBlur(csEl);
        const bleedOutline = parseOutline(csEl);
        const drop = parseFilterDropShadows(csEl);

        const bleed = !outerShadows
          ? { top: 0, right: 0, bottom: 0, left: 0 }
          : {
              top: limitDecimals(
                bleedShadow.top + bleedBlur.top + bleedOutline.top + drop.bleed.top,
              ),
              right: limitDecimals(
                bleedShadow.right + bleedBlur.right + bleedOutline.right + drop.bleed.right,
              ),
              bottom: limitDecimals(
                bleedShadow.bottom + bleedBlur.bottom + bleedOutline.bottom + drop.bleed.bottom,
              ),
              left: limitDecimals(
                bleedShadow.left + bleedBlur.left + bleedOutline.left + drop.bleed.left,
              ),
            };

        minX = limitDecimals(minX - bleed.left);
        minY = limitDecimals(minY - bleed.top);
        maxX = limitDecimals(maxX + bleed.right);
        maxY = limitDecimals(maxY + bleed.bottom);

        const vbW0 = Math.max(1, limitDecimals(maxX - minX));
        const vbH0 = Math.max(1, limitDecimals(maxY - minY));
        const scaleW = hasW || hasH ? limitDecimals(w / w0) : 1;
        const scaleH = hasH || hasW ? limitDecimals(h / h0) : 1;
        const outW = Math.max(1, limitDecimals(vbW0 * scaleW));
        const outH = Math.max(1, limitDecimals(vbH0 * scaleH));

        const svgNS = "http://www.w3.org/2000/svg";
        const basePad = isSafari() && hasTFBBox(state.element) ? 1 : 0;
        const extraPad = !outerTransforms ? 1 : 0;
        const pad = limitDecimals(basePad + extraPad);

        const fo = document.createElementNS(svgNS, "foreignObject");
        const vbMinX = limitDecimals(minX);
        const vbMinY = limitDecimals(minY);
        fo.setAttribute("x", String(limitDecimals(-(vbMinX - pad))));
        fo.setAttribute("y", String(limitDecimals(-(vbMinY - pad))));
        fo.setAttribute("width", String(limitDecimals(w0 + pad * 2)));
        fo.setAttribute("height", String(limitDecimals(h0 + pad * 2)));
        fo.style.overflow = "visible";

        const styleTag = document.createElement("style");
        const foNormalize =
          "svg{overflow:visible;} foreignObject{overflow:visible;} " +
          "foreignObject>div{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;}";
        styleTag.textContent =
          (state.scrollbarCSS || "") +
          state.baseCSS! +
          state.fontsCSS! +
          foNormalize +
          state.classCSS!;
        fo.appendChild(styleTag);

        const container = document.createElement("div");
        container.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        container.style.cssText =
          "all:initial;box-sizing:border-box;display:block;overflow:visible;" +
          `width:${limitDecimals(w0)}px;height:${limitDecimals(h0)}px`;

        container.appendChild(state.clone!);
        fo.appendChild(container);

        const serializer = new XMLSerializer();
        const foString = serializer.serializeToString(fo);
        const vbW = limitDecimals(vbW0 + pad * 2);
        const vbH = limitDecimals(vbH0 + pad * 2);
        const wantsSize = hasW || hasH;

        options.meta = { w0, h0, vbW, vbH, targetW: w, targetH: h };

        const svgOutW = isSafari() && wantsSize ? vbW : limitDecimals(outW + pad * 2);
        const svgOutH = isSafari() && wantsSize ? vbH : limitDecimals(outH + pad * 2);

        const rootFontSize = parseFloat(getStyle(elDoc.documentElement)?.fontSize) || 16;
        const svgHeader = `<svg xmlns="${svgNS}" width="${svgOutW}" height="${svgOutH}" viewBox="0 0 ${vbW} ${vbH}" font-size="${rootFontSize}px">`;
        const svgFooter = "</svg>";
        svgString = svgHeader + foString + svgFooter;
        dataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        state = { svgString, dataURL, ...state };
        resolve();
      },
      { fast },
    );
  });
  await runHook("afterRender", state);

  const sandbox = document.getElementById("snapshot-sandbox");
  if (sandbox && sandbox.style.position === "absolute") sandbox.remove();
  return state.dataURL!;
};

const hasTFBBox = (el: Element): boolean => {
  return hasBBoxAffectingTransform(el);
};
