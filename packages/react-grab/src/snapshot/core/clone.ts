import { inlineAllStyles } from "../modules/styles.js";
import { NO_CAPTURE_TAGS } from "../utils/css.js";
import { resolveCSSVars, isInSvgTemplate } from "../modules/css-var.js";
import { debugWarn } from "../utils/index.js";
import {
  idleCallback,
  rewriteShadowCSS,
  nextShadowScopeId,
  extractShadowCSS,
  injectScopedStyle,
  freezeImgSrcset,
  collectCustomPropsFromCSS,
  buildSeedCustomPropsRule,
  markSlottedSubtree,
  rasterizeIframe,
  getUnscaledDimensions,
  createCheckboxRadioReplacement,
} from "../utils/clone-helpers.js";
import { isFirefox } from "../utils/browser.js";
import type { SnapshotCaptureContext, SnapshotSessionCache } from "../types.js";

const makeHideSpacer = (node: Element): HTMLDivElement => {
  const { width, height } = getUnscaledDimensions(node);
  let w = width,
    h = height;
  if (!w || !h) {
    const rect = node.getBoundingClientRect();
    w = w || rect.width || 0;
    h = h || rect.height || 0;
  }
  const spacer = document.createElement("div");
  spacer.style.cssText = `display:inline-block;width:${w}px;height:${h}px;visibility:hidden;`;
  return spacer;
};

export const deepClone = async (
  node: Node,
  sessionCache: SnapshotSessionCache,
  options: SnapshotCaptureContext,
): Promise<Node | null> => {
  if (!node) throw new Error("Invalid node");
  const clonedAssignedNodes = new Set<Node>();
  let pendingSelectValue: string | null = null;
  let pendingTextAreaValue: string | null = null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elementNode = node as Element;
    const tag = (elementNode.localName || elementNode.tagName || "").toLowerCase();
    if (
      elementNode.id === "snapshot-sandbox" ||
      elementNode.hasAttribute("data-snapshot-sandbox")
    ) {
      return null;
    }
    if (NO_CAPTURE_TAGS.has(tag)) {
      return null;
    }
    if (tag === "foreignobject" && elementNode.parentElement?.closest?.("foreignObject")) {
      debugWarn(
        sessionCache,
        "Nested <foreignObject> skipped (SVG spec limitation — not rendered by browsers)",
      );
      return null;
    }
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.cloneNode(true);
  }
  const el = node as Element;
  if (el.getAttribute("data-capture") === "exclude") {
    if (options.excludeMode === "hide") {
      return makeHideSpacer(el);
    } else if (options.excludeMode === "remove") {
      return null;
    }
  }
  if (options.exclude && Array.isArray(options.exclude)) {
    for (const selector of options.exclude) {
      try {
        if (el.matches?.(selector)) {
          if (options.excludeMode === "hide") {
            return makeHideSpacer(el);
          } else if (options.excludeMode === "remove") {
            return null;
          }
        }
      } catch (err) {
        console.warn(`Invalid selector in exclude option: ${selector}`, err);
      }
    }
  }
  if (typeof options.filter === "function") {
    try {
      if (!options.filter(el)) {
        if (options.filterMode === "hide") {
          return makeHideSpacer(el);
        } else if (options.filterMode === "remove") {
          return null;
        }
      }
    } catch (err) {
      console.warn("Error in filter function:", err);
    }
  }
  if (el.tagName === "IFRAME") {
    const iframeEl = el as HTMLIFrameElement;
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(iframeEl.contentDocument || iframeEl.contentWindow?.document);
    } catch (e) {
      debugWarn(sessionCache, "iframe same-origin probe failed", e);
    }

    if (sameOrigin) {
      try {
        const wrapper = await rasterizeIframe(iframeEl, sessionCache, options);
        return wrapper;
      } catch (err) {
        console.warn("[Snapshot] iframe rasterization failed, fallback:", err);
      }
    }

    if (!sameOrigin) {
      console.warn(
        "[snapshot] cross-origin <iframe> skipped (cannot access content). Use options.placeholders to show a placeholder instead.",
        el,
      );
    }

    if (options.placeholders) {
      const { width, height } = getUnscaledDimensions(el);
      const fallback = document.createElement("div");
      fallback.style.cssText =
        `width:${width}px;height:${height}px;` +
        "background-image:repeating-linear-gradient(45deg,#ddd,#ddd 5px,#f9f9f9 5px,#f9f9f9 10px);" +
        "display:flex;align-items:center;justify-content:center;font-size:12px;color:#555;border:1px solid #aaa;";
      inlineAllStyles(el, fallback, sessionCache, options);
      return fallback;
    } else {
      const { width, height } = getUnscaledDimensions(el);
      const spacer = document.createElement("div");
      spacer.style.cssText = `display:inline-block;width:${width}px;height:${height}px;visibility:hidden;`;
      inlineAllStyles(el, spacer, sessionCache, options);
      return spacer;
    }
  }

  if (el.getAttribute("data-capture") === "placeholder") {
    const clone2 = el.cloneNode(false) as Element;
    sessionCache.nodeMap.set(clone2, el);
    inlineAllStyles(el, clone2, sessionCache, options);
    const placeholder = document.createElement("div");
    placeholder.textContent = el.getAttribute("data-placeholder-text") || "";
    placeholder.style.cssText =
      "color:#666;font-size:12px;text-align:center;line-height:1.4;padding:0.5em;box-sizing:border-box;";
    clone2.appendChild(placeholder);
    return clone2;
  }
  if (el.tagName === "CANVAS") {
    const canvasEl = el as HTMLCanvasElement;
    let url = "";
    try {
      const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
      try {
        if (ctx) ctx.getImageData(0, 0, 1, 1);
      } catch {}
      await new Promise((r) => requestAnimationFrame(r));

      url = canvasEl.toDataURL("image/png");

      if (!url || url === "data:,") {
        try {
          if (ctx) ctx.getImageData(0, 0, 1, 1);
        } catch {}
        await new Promise((r) => requestAnimationFrame(r));
        url = canvasEl.toDataURL("image/png");

        if (!url || url === "data:,") {
          const scratch = document.createElement("canvas");
          scratch.width = canvasEl.width;
          scratch.height = canvasEl.height;
          const sctx = scratch.getContext("2d");
          if (sctx) {
            sctx.drawImage(canvasEl, 0, 0);
            url = scratch.toDataURL("image/png");
          }
        }
      }
    } catch (e) {
      debugWarn(sessionCache, "Canvas toDataURL failed, using empty/fallback", e);
    }

    const img = document.createElement("img");
    try {
      img.decoding = "sync";
      img.loading = "eager";
    } catch (e) {
      debugWarn(sessionCache, "img decoding/loading hints failed", e);
    }
    if (url) img.src = url;

    img.width = canvasEl.width;
    img.height = canvasEl.height;

    const { width, height } = getUnscaledDimensions(el);
    if (width > 0) img.style.width = `${width}px`;
    if (height > 0) img.style.height = `${height}px`;

    sessionCache.nodeMap.set(img, el);
    inlineAllStyles(el, img, sessionCache, options);
    return img;
  }

  if (el.tagName === "VIDEO") {
    const videoEl = el as HTMLVideoElement;
    let url = "";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || videoEl.offsetWidth || 320;
      canvas.height = videoEl.videoHeight || videoEl.offsetHeight || 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        url = canvas.toDataURL("image/png");
        if (!url || url === "data:,") url = "";
      }
    } catch (e) {
      debugWarn(sessionCache, "Video frame capture failed, using poster fallback", e);
    }

    const img = document.createElement("img");
    try {
      img.decoding = "sync";
      img.loading = "eager";
    } catch {}
    if (url) {
      img.src = url;
    } else if (videoEl.poster) {
      img.src = videoEl.poster;
    }

    img.width = videoEl.videoWidth || videoEl.offsetWidth || 0;
    img.height = videoEl.videoHeight || videoEl.offsetHeight || 0;

    const { width, height } = getUnscaledDimensions(el);
    if (width > 0) img.style.width = `${width}px`;
    if (height > 0) img.style.height = `${height}px`;
    img.style.objectFit = "contain";

    sessionCache.nodeMap.set(img, el);
    inlineAllStyles(el, img, sessionCache, options);
    return img;
  }

  let clone: HTMLElement;
  try {
    clone = el.cloneNode(false) as HTMLElement;
    if (clone.attributes?.length) {
      try {
        for (const attr of clone.attributes) {
          /* eslint-disable no-control-regex */
          if (/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/.test(attr.value)) {
            clone.setAttribute(
              attr.name,
              attr.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, ""),
            );
          }
          /* eslint-enable no-control-regex */
        }
      } catch {}
    }
    resolveCSSVars(el, clone);
    sessionCache.nodeMap.set(clone, el);
    if (el.tagName === "IMG") {
      freezeImgSrcset(el as HTMLImageElement, clone as HTMLImageElement);
      try {
        const { width, height } = getUnscaledDimensions(el);
        const w = Math.round(width || 0);
        const h = Math.round(height || 0);
        if (w) clone.dataset.snapshotWidth = String(w);
        if (h) clone.dataset.snapshotHeight = String(h);
      } catch (e) {
        debugWarn(sessionCache, "getUnscaledDimensions for IMG failed", e);
      }

      try {
        const authored = el.getAttribute("style") || "";
        const cs = window.getComputedStyle(el);
        const usesPercentOrAuto = (prop: string): boolean => {
          const a = authored.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, "i"));
          const v = a ? a[1].trim() : cs.getPropertyValue(prop);
          return /%|auto/i.test(String(v || ""));
        };

        const w = parseInt(clone.dataset.snapshotWidth || "0", 10);
        const h = parseInt(clone.dataset.snapshotHeight || "0", 10);

        const needFreezeW = usesPercentOrAuto("width") || !w;
        const needFreezeH = usesPercentOrAuto("height") || !h;

        if (needFreezeW && w) clone.style.width = `${w}px`;
        if (needFreezeH && h) clone.style.height = `${h}px`;

        const objectFit = cs.getPropertyValue("object-fit");
        const objectPosition = cs.getPropertyValue("object-position");
        if (objectFit && objectFit !== "fill") {
          clone.style.objectFit = objectFit;
          if (objectPosition) clone.style.objectPosition = objectPosition;
        } else {
          if (w) clone.style.minWidth = `${w}px`;
          if (h) clone.style.minHeight = `${h}px`;
        }
      } catch (e) {
        debugWarn(sessionCache, "IMG dimension freeze failed", e);
      }
    }
  } catch (err) {
    console.error("[Snapshot] Failed to clone node:", node, err);
    throw err;
  }
  let applyInputVisual: (() => void) | null = null;
  if (el instanceof HTMLTextAreaElement) {
    const { width, height } = getUnscaledDimensions(el);
    const w = width || el.getBoundingClientRect().width || 0;
    const h = height || el.getBoundingClientRect().height || 0;
    if (w) clone.style.width = `${w}px`;
    if (h) clone.style.height = `${h}px`;
  }
  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
    const isCheckboxOrRadio = type === "checkbox" || type === "radio";
    if (isCheckboxOrRadio && isFirefox()) {
      const { el: replacement, applyVisual } = createCheckboxRadioReplacement(el);
      sessionCache.nodeMap.set(replacement, el);
      applyInputVisual = applyVisual;
      clone = replacement;
    } else {
      const inputClone = clone as HTMLInputElement;
      inputClone.value = el.value;
      inputClone.setAttribute("value", el.value);
      if (el.checked !== void 0) {
        inputClone.checked = el.checked;
        if (el.checked) inputClone.setAttribute("checked", "");
        if (el.indeterminate) inputClone.indeterminate = el.indeterminate;
      }
    }
  }

  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    !el.value &&
    el.placeholder
  ) {
    try {
      const phStyle = window.getComputedStyle(el, "::placeholder");
      const phColor = phStyle && phStyle.color;
      if (phColor && phColor !== "rgba(0, 0, 0, 0)") {
        const uid = "snapshot-ph-" + ((Math.random() * 1e6) | 0);
        clone.classList.add(uid);
        const styleEl = document.createElement("style");
        styleEl.textContent = `.${uid}::placeholder{color:${phColor}!important;opacity:${phStyle.opacity || "1"}!important;-webkit-text-fill-color:${phColor}!important;}`;
        clone.prepend(styleEl);
      }
    } catch {}
  }

  if (el instanceof HTMLSelectElement) {
    pendingSelectValue = el.value;
  }
  if (el instanceof HTMLTextAreaElement) {
    pendingTextAreaValue = el.value;
  }
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    if (el.disabled) clone.setAttribute("disabled", "");
    if (el.required) clone.setAttribute("required", "");
    if ((el as HTMLInputElement | HTMLTextAreaElement).readOnly) clone.setAttribute("readonly", "");
    const inputNode = el as HTMLInputElement;
    if (inputNode.min !== undefined && inputNode.min !== "")
      clone.setAttribute("min", inputNode.min);
    if (inputNode.max !== undefined && inputNode.max !== "")
      clone.setAttribute("max", inputNode.max);
    if (inputNode.pattern !== undefined && inputNode.pattern !== "")
      clone.setAttribute("pattern", inputNode.pattern);
    const ariaInvalid = el.getAttribute("aria-invalid");
    if (ariaInvalid !== null) clone.setAttribute("aria-invalid", ariaInvalid);
  }
  if (!isInSvgTemplate(el)) {
    inlineAllStyles(el, clone, sessionCache, options);
  }
  if (applyInputVisual) {
    applyInputVisual();
  }
  if (el instanceof SVGElement && !isInSvgTemplate(el)) {
    const SVG_PAINT_PROPS = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "opacity",
      "fill-opacity",
      "stroke-opacity",
      "fill-rule",
      "clip-rule",
      "marker",
      "marker-start",
      "marker-mid",
      "marker-end",
      "visibility",
      "display",
    ];
    try {
      const cs = window.getComputedStyle(el);
      for (const prop of SVG_PAINT_PROPS) {
        const val = cs.getPropertyValue(prop);
        if (val) clone.style.setProperty(prop, val);
      }
    } catch {}
  }
  if (el.shadowRoot) {
    try {
      const slots = el.shadowRoot.querySelectorAll("slot");
      for (const s of slots) {
        let assigned: Node[] = [];
        try {
          assigned = s.assignedNodes?.({ flatten: true }) || s.assignedNodes?.() || [];
        } catch {
          assigned = s.assignedNodes?.() || [];
        }
        for (const an of assigned) clonedAssignedNodes.add(an);
      }
    } catch {}
    const scopeId = nextShadowScopeId(sessionCache);
    const scopeSelector = `[data-sd="${scopeId}"]`;
    try {
      clone.setAttribute("data-sd", scopeId);
    } catch {}
    const rawCSS = extractShadowCSS(el.shadowRoot);
    const rewritten = rewriteShadowCSS(rawCSS, scopeSelector);
    const neededVars = collectCustomPropsFromCSS(rawCSS);
    const seed = buildSeedCustomPropsRule(el, neededVars, scopeSelector);
    injectScopedStyle(clone, seed + rewritten, scopeId);
    const shadowFrag = document.createDocumentFragment();
    const callback = (child: Node, resolve: (value: Node | null) => void): void => {
      if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === "STYLE") {
        return resolve(null);
      } else {
        deepClone(child, sessionCache, options)
          .then((clonedChild) => {
            resolve(clonedChild || null);
          })
          .catch(() => {
            resolve(null);
          });
      }
    };

    const cloneList = await idleCallback(
      Array.from(el.shadowRoot.childNodes),
      callback,
      options.fast as boolean,
    );
    shadowFrag.append(
      ...cloneList.filter((clonedChild): clonedChild is Node => Boolean(clonedChild)),
    );
    clone.appendChild(shadowFrag);
  }
  if (el.tagName === "SLOT") {
    const slotEl = el as HTMLSlotElement;
    const assigned = slotEl.assignedNodes?.({ flatten: true }) || [];
    const nodesToClone = assigned.length > 0 ? assigned : Array.from(el.childNodes);
    const fragment = document.createDocumentFragment();

    const callback = (child: Node, resolve: (value: Node | null) => void): void => {
      deepClone(child, sessionCache, options)
        .then((clonedChild) => {
          if (clonedChild) {
            markSlottedSubtree(clonedChild as Element);
          }
          resolve(clonedChild || null);
        })
        .catch(() => {
          resolve(null);
        });
    };
    const cloneList = await idleCallback(
      Array.from(nodesToClone),
      callback,
      options.fast as boolean,
    );
    fragment.append(
      ...cloneList.filter((clonedChild): clonedChild is Node => Boolean(clonedChild)),
    );
    return fragment;
  }

  const callback = (child: Node, resolve: (value: Node | null) => void): void => {
    if (clonedAssignedNodes.has(child)) return resolve(null);
    deepClone(child, sessionCache, options)
      .then((clonedChild) => {
        resolve(clonedChild || null);
      })
      .catch(() => {
        resolve(null);
      });
  };
  const cloneList = await idleCallback(
    Array.from(el.childNodes),
    callback,
    options.fast as boolean,
  );
  clone.append(...cloneList.filter((clonedChild): clonedChild is Node => Boolean(clonedChild)));

  if (pendingSelectValue !== null && clone instanceof HTMLSelectElement) {
    clone.value = pendingSelectValue;
    for (const opt of clone.options) {
      if (opt.value === pendingSelectValue) {
        opt.setAttribute("selected", "");
      } else {
        opt.removeAttribute("selected");
      }
    }
  }
  if (pendingTextAreaValue !== null && clone instanceof HTMLTextAreaElement) {
    clone.textContent = pendingTextAreaValue;
  }
  return clone;
};
