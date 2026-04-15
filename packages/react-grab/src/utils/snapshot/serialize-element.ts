import {
  SNAPSHOT_SKIPPED_TAGS,
  SNAPSHOT_DATA_ATTRIBUTE,
  SNAPSHOT_TABLE_LIKE_TAGS,
  SNAPSHOT_INPUT_TAGS,
  SNAPSHOT_VIDEO_FALLBACK_WIDTH_PX,
  SNAPSHOT_VIDEO_FALLBACK_HEIGHT_PX,
  SNAPSHOT_SVG_SKIPPED_ATTRIBUTES,
  SNAPSHOT_SVG_COLOR_ATTRIBUTES,
  SNAPSHOT_SVG_DIMENSION_ATTRIBUTES,
  SNAPSHOT_SVG_USE_SKIPPED_ATTRIBUTES,
  SNAPSHOT_VOID_ELEMENTS,
  SNAPSHOT_MAX_USE_RECURSION_DEPTH,
  SNAPSHOT_MAX_SERIALIZATION_DEPTH,
  SNAPSHOT_PRESERVED_ATTRIBUTES,
  SNAPSHOT_PRESERVED_ATTRIBUTE_PREFIXES,
  SNAPSHOT_PROGRESS_METER_TAGS,
  SNAPSHOT_EVENT_HANDLER_PATTERN,
  SNAPSHOT_DANGEROUS_URL_PROTOCOLS,
  SNAPSHOT_PRESERVED_SEMANTIC_TAGS,
} from "../../constants.js";
import { escapeHtml } from "./escape-html.js";
import { fetchAsDataUrl } from "./fetch-as-data-url.js";
import { materializePseudoElement } from "./materialize-pseudo.js";
import { resolveAncestorBackground } from "./resolve-ancestor-background.js";
import {
  computeNonDefaultStyles,
  stylesToInlineString,
  disposeSnapshotBaseline,
  precacheCommonTagDefaults,
} from "./snapshot-style-diff.js";
import { resolveElementCssVars, disposeVarBaseline } from "./snapshot-resolve-css-vars.js";
import { embedUsedFonts } from "./snapshot-embed-fonts.js";
import { serializeShadowRoot, resolveSlotContent, resetShadowScopeCounter } from "./snapshot-shadow-dom.js";
import { preserveScrollPosition, adjustPositionedChildForScroll } from "./snapshot-scroll-position.js";
import { captureInputState, serializeInputStateAttributes } from "./snapshot-input-state.js";
import { buildCounterContext, hasCounterReferences, resolveCounterContent } from "./snapshot-css-counters.js";
import { resolveImageElementSource } from "./snapshot-picture-resolver.js";
import { captureIframeContent, createIframePlaceholder } from "./snapshot-iframe-capture.js";
import { inlineExternalSvgDefs } from "./snapshot-svg-defs.js";
import { stabilizeLineClamp } from "./snapshot-line-clamp.js";
import { forceContentVisibility } from "./snapshot-content-visibility.js";
import { resolveBlobUrlsInStyles } from "./snapshot-blob-resolver.js";
import { rasterizeIconFontElementToImage } from "./snapshot-icon-font.js";
import { inlineAllBackgroundUrls } from "./snapshot-inline-backgrounds.js";
import { stabilizeElementLayout } from "./snapshot-stabilize-layout.js";
import { collectScrollbarCss } from "./snapshot-scrollbar-css.js";
import { materializeFirstLetter } from "./snapshot-first-letter.js";
import { sanitizeSerializedAttributes } from "./snapshot-sanitize-attributes.js";
import { yieldToMainThread } from "./snapshot-idle-scheduler.js";
import { generateBaseResetCss } from "./snapshot-base-css.js";
import { createStyleDeduplicator } from "./snapshot-style-dedup.js";
import { deduplicatedFetchAsDataUrl, clearInflightRequests } from "./snapshot-fetch-dedup.js";

export interface SerializeElementOptions {
  inlineImages?: boolean;
  embedFonts?: boolean;
  abortSignal?: AbortSignal;
  onProgress?: (processedNodes: number) => void;
}

export interface SerializeResult {
  status: "success" | "aborted" | "error";
  html: string;
  nodeCount: number;
  fontsCss: string;
  shadowCss: string;
  scrollbarCss: string;
  elementCss: string;
  baseCss: string;
}

const safeGetComputedStyle = (element: Element): CSSStyleDeclaration => {
  try {
    return getComputedStyle(element);
  } catch {
    return getComputedStyle(document.documentElement);
  }
};

const isElementHidden = (element: Element): boolean => {
  const computed = safeGetComputedStyle(element);
  if (computed.display === "none") return true;
  if (computed.visibility === "hidden" && computed.display !== "contents") return true;

  const isPositioned =
    computed.position === "absolute" || computed.position === "fixed";

  if (computed.opacity === "0") {
    const parentElement = element.parentElement;
    const isOnlyChild = parentElement !== null && parentElement.childElementCount === 1;
    if (isPositioned || isOnlyChild) return true;
  }

  const hasZeroDimensions =
    parseFloat(computed.height) === 0 || parseFloat(computed.width) === 0;
  if (hasZeroDimensions) {
    const parentDisplay = element.parentElement
      ? safeGetComputedStyle(element.parentElement).display
      : "";
    const isBlockParent =
      parentDisplay === "block" || parentDisplay === "inline-block";
    if (isPositioned || isBlockParent) return true;
  }

  return false;
};

const measureRangeWidth = (textNode: Text, startOffset: number, endOffset: number): number => {
  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);
  return range.getBoundingClientRect().width;
};

const normalizeTextContent = (textNode: Text): string => {
  const rawText = textNode.textContent;
  if (!rawText) return "";

  const parentElement = textNode.parentElement;
  if (parentElement) {
    const whiteSpace = safeGetComputedStyle(parentElement).whiteSpace;
    if (whiteSpace === "pre" || whiteSpace === "pre-wrap") return rawText;
    if (whiteSpace === "pre-line") return rawText.replace(/[^\S\n]+/g, " ");
  }

  const trimmedText = rawText.replace(/\s+/g, " ").trim();
  if (!trimmedText) {
    return measureRangeWidth(textNode, 0, rawText.length) === 0 ? "" : " ";
  }

  const leadingWhitespaceLength = rawText.length - rawText.trimStart().length;
  const trailingWhitespaceLength = rawText.length - rawText.trimEnd().length;

  const hasVisibleLeadingSpace =
    leadingWhitespaceLength > 0 && measureRangeWidth(textNode, 0, leadingWhitespaceLength) > 0;
  const hasVisibleTrailingSpace =
    trailingWhitespaceLength > 0 &&
    measureRangeWidth(textNode, rawText.length - trailingWhitespaceLength, rawText.length) > 0;

  return (
    (hasVisibleLeadingSpace ? " " : "") +
    trimmedText +
    (hasVisibleTrailingSpace ? " " : "")
  );
};

const captureCanvasAsDataUrl = (canvasElement: HTMLCanvasElement): string => {
  try {
    const context = canvasElement.getContext("2d", { willReadFrequently: true });
    try { context?.getImageData(0, 0, 1, 1); } catch { /* WebKit paint pipeline priming */ }

    const dataUrl = canvasElement.toDataURL("image/png");
    if (dataUrl && dataUrl !== "data:,") return dataUrl;

    const scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = canvasElement.width;
    scratchCanvas.height = canvasElement.height;
    const scratchContext = scratchCanvas.getContext("2d");
    if (scratchContext) {
      scratchContext.drawImage(canvasElement, 0, 0);
      return scratchCanvas.toDataURL("image/png");
    }
    return "";
  } catch {
    return "";
  }
};

const captureVideoFrame = (videoElement: HTMLVideoElement): string => {
  const posterFallback = videoElement.poster || "";
  try {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = videoElement.videoWidth || videoElement.offsetWidth || SNAPSHOT_VIDEO_FALLBACK_WIDTH_PX;
    offscreenCanvas.height = videoElement.videoHeight || videoElement.offsetHeight || SNAPSHOT_VIDEO_FALLBACK_HEIGHT_PX;
    const canvasContext = offscreenCanvas.getContext("2d");
    if (!canvasContext) return posterFallback;

    canvasContext.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const frameDataUrl = offscreenCanvas.toDataURL("image/png");
    return frameDataUrl && frameDataUrl !== "data:," ? frameDataUrl : posterFallback;
  } catch {
    return posterFallback;
  }
};

const resolveSvgUseReferences = (
  svgUseElement: SVGElement,
  parentAttributes: [string, string][],
  visitedUseIds: Set<string>,
): Element | null => {
  const href =
    svgUseElement.getAttribute("href") || svgUseElement.getAttribute("xlink:href");
  if (!href) return null;

  const elementId = href.replace("#", "");
  if (visitedUseIds.has(elementId)) return null;
  if (visitedUseIds.size >= SNAPSHOT_MAX_USE_RECURSION_DEPTH) return null;
  visitedUseIds.add(elementId);

  const referencedElement = document.getElementById(elementId);
  if (!referencedElement) return null;

  if (referencedElement.tagName === "symbol" || referencedElement.tagName === "svg") {
    for (const attributeName of referencedElement.getAttributeNames()) {
      if (SNAPSHOT_SVG_USE_SKIPPED_ATTRIBUTES.has(attributeName)) continue;
      parentAttributes.push([
        attributeName,
        referencedElement.getAttribute(attributeName) || "",
      ]);
    }
  }

  return referencedElement;
};

/* eslint-disable no-control-regex */
const XML_INVALID_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g;
/* eslint-enable no-control-regex */

const stripXmlInvalidCharacters = (value: string): string =>
  value.replace(XML_INVALID_CONTROL_CHARS, "");

const escapeAttributeValue = (value: string): string =>
  stripXmlInvalidCharacters(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "&#10;")
    .replaceAll("\r", "&#13;");

const escapeSrcAttributeValue = (value: string): string =>
  value.replaceAll('"', "&quot;");

const materializeListMarker = (element: Element): string | null => {
  const tagName = element.tagName.toLowerCase();
  if (tagName !== "li") return null;

  const computed = safeGetComputedStyle(element);
  const listStyleType = computed.listStyleType;
  if (listStyleType === "none") return null;

  const markerComputed = getComputedStyle(element, "::marker");
  const markerContent = markerComputed.getPropertyValue("content");
  if (!markerContent || markerContent === "none" || markerContent === "normal") return null;

  const unquoted = markerContent.match(/^["'](.*)["']$/);
  const markerText = unquoted ? unquoted[1] : "";
  if (!markerText) return null;

  const markerStyles: Record<string, string> = {
    "unicode-bidi": "isolate",
    "font-variant-numeric": "tabular-nums",
  };

  const markerColor = markerComputed.getPropertyValue("color");
  if (markerColor) markerStyles.color = markerColor;
  const markerFontSize = markerComputed.getPropertyValue("font-size");
  if (markerFontSize) markerStyles["font-size"] = markerFontSize;

  return `<span style="${stylesToInlineString(markerStyles)}">${escapeHtml(markerText)}</span>`;
};

interface SerializeContext {
  options: SerializeElementOptions;
  counterContext: ReturnType<typeof buildCounterContext>;
  collectedShadowCss: string[];
  computedStyleCache: WeakMap<Element, CSSStyleDeclaration>;
  visitedUseIds: Set<string>;
  currentDepth: number;
  styleDeduplicator: ReturnType<typeof createStyleDeduplicator>;
  totalNodesProcessed: number;
}

const getCachedComputedStyle = (element: Element, context: SerializeContext): CSSStyleDeclaration => {
  const cached = context.computedStyleCache.get(element);
  if (cached) return cached;
  const computed = safeGetComputedStyle(element);
  context.computedStyleCache.set(element, computed);
  return computed;
};

const collectPreservedAttributes = (element: Element): Array<[string, string]> => {
  const preserved: Array<[string, string]> = [];

  for (const attributeName of element.getAttributeNames()) {
    if (SNAPSHOT_EVENT_HANDLER_PATTERN.test(attributeName)) continue;

    if (SNAPSHOT_PRESERVED_ATTRIBUTES.has(attributeName)) {
      preserved.push([attributeName, element.getAttribute(attributeName) || ""]);
      continue;
    }

    const shouldPreserveByPrefix = SNAPSHOT_PRESERVED_ATTRIBUTE_PREFIXES.some(
      (prefix) => attributeName.startsWith(prefix),
    );
    if (shouldPreserveByPrefix) {
      preserved.push([attributeName, element.getAttribute(attributeName) || ""]);
    }
  }

  return preserved;
};

const stripSnapshotIrrelevantProperties = (styles: Record<string, string>): void => {
  delete styles.content;
  if (styles.all !== undefined) delete styles.all;
  if (styles.d !== undefined) delete styles.d;
};

const isDangerousUrl = (url: string): boolean => {
  const trimmedUrl = url.trim().toLowerCase();
  for (const protocol of SNAPSHOT_DANGEROUS_URL_PROTOCOLS) {
    if (trimmedUrl.startsWith(protocol)) return true;
  }
  return false;
};

const sanitizeUrlAttribute = (attributeName: string, attributeValue: string): string | null => {
  if (attributeName !== "href" && attributeName !== "action" && attributeName !== "formaction") {
    return attributeValue;
  }
  return isDangerousUrl(attributeValue) ? null : attributeValue;
};

const resolveSelectedOptionText = (selectElement: HTMLSelectElement): string => {
  const selectedIndex = selectElement.selectedIndex;
  if (selectedIndex >= 0 && selectElement.options[selectedIndex]) {
    return selectElement.options[selectedIndex].textContent || "";
  }
  return selectElement.firstElementChild?.textContent || "";
};

const captureProgressMeterAsDiv = (element: Element): string | null => {
  const tagName = element.tagName.toLowerCase();
  if (!SNAPSHOT_PROGRESS_METER_TAGS.has(tagName)) return null;

  const computed = safeGetComputedStyle(element);
  const elementWidth = parseFloat(computed.width) || 100;
  const elementHeight = parseFloat(computed.height) || 20;

  let fillPercentage = 0;
  if (element instanceof HTMLProgressElement) {
    fillPercentage = element.max > 0 ? (element.value / element.max) * 100 : 0;
  } else if (element instanceof HTMLMeterElement) {
    const range = element.max - element.min;
    fillPercentage = range > 0 ? ((element.value - element.min) / range) * 100 : 0;
  }

  const containerStyles = `width:${elementWidth}px;height:${elementHeight}px;background:#e0e0e0;border-radius:3px;overflow:hidden;display:inline-block;`;
  const fillStyles = `width:${fillPercentage}%;height:100%;background:#4caf50;`;

  return `<div style="${containerStyles}" ${SNAPSHOT_DATA_ATTRIBUTE}-original-tag="${element.tagName}"><div style="${fillStyles}"></div></div>`;
};

const serializeNode = async (
  node: Node,
  context: SerializeContext,
  isRoot: boolean,
  processedNodeCount: number,
): Promise<{ html: string; processedNodes: number }> => {
  if (context.options.abortSignal?.aborted) {
    return { html: "", processedNodes: 0 };
  }

  context.options.onProgress?.(processedNodeCount + 1);

  if (context.currentDepth > SNAPSHOT_MAX_SERIALIZATION_DEPTH) {
    return { html: "", processedNodes: 1 };
  }

  if (!(node instanceof Element)) {
    if (node instanceof Text) {
      const normalizedText = normalizeTextContent(node);
      return { html: escapeHtml(normalizedText), processedNodes: 1 };
    }
    return { html: "", processedNodes: 1 };
  }

  const tagName = node.tagName.toLowerCase();

  if (SNAPSHOT_SKIPPED_TAGS.has(tagName) || tagName === "template") {
    return { html: "", processedNodes: 1 };
  }

  if (isElementHidden(node)) {
    return { html: "", processedNodes: 1 };
  }

  if (tagName === "br" || tagName === "hr") {
    return { html: `<${tagName}>`, processedNodes: 1 };
  }

  const progressMeterHtml = captureProgressMeterAsDiv(node);
  if (progressMeterHtml) {
    return { html: progressMeterHtml, processedNodes: 1 };
  }

  if (node instanceof HTMLIFrameElement) {
    if (context.options.inlineImages) {
      const iframeDataUrl = await captureIframeContent(node);
      if (iframeDataUrl) {
        const iframeWidth = node.offsetWidth || node.clientWidth;
        const iframeHeight = node.offsetHeight || node.clientHeight;
        return {
          html: `<img src="${escapeSrcAttributeValue(iframeDataUrl)}" width="${iframeWidth}" height="${iframeHeight}" style="border:none;">`,
          processedNodes: 1,
        };
      }
    }
    return { html: createIframePlaceholder(node), processedNodes: 1 };
  }

  const rasterizedIconHtml = await rasterizeIconFontElementToImage(node);
  if (rasterizedIconHtml) {
    return { html: rasterizedIconHtml, processedNodes: 1 };
  }

  let totalProcessedNodes = 1;
  const serializedChildFragments: string[] = [];
  const attributes: [string, string][] = [];

  const authoredStyles = computeNonDefaultStyles(node, { isRoot });
  resolveElementCssVars(node, authoredStyles);
  stripSnapshotIrrelevantProperties(authoredStyles);
  await resolveBlobUrlsInStyles(authoredStyles);

  const computed = getCachedComputedStyle(node, context);

  if (
    (computed.overflowX === "hidden" || computed.overflowY === "hidden") &&
    authoredStyles["text-overflow"] === "ellipsis" &&
    node instanceof HTMLElement &&
    node.scrollWidth <= node.clientWidth
  ) {
    authoredStyles["text-overflow"] = "clip";
  }

  if (tagName === "pre") {
    authoredStyles["margin-top"] = "0";
    authoredStyles["margin-block-start"] = "0";
  }

  const preservedAttributes = collectPreservedAttributes(node);
  for (const [attributeName, attributeValue] of preservedAttributes) {
    attributes.push([attributeName, attributeValue]);
  }

  if (isRoot) {
    const hasTransparentBackground =
      !authoredStyles["background-color"] ||
      authoredStyles["background-color"] === "rgba(0, 0, 0, 0)";
    if (hasTransparentBackground) {
      const inheritedBackground = resolveAncestorBackground(node);
      if (inheritedBackground) {
        authoredStyles["background-color"] = inheritedBackground;
      }
    }
    authoredStyles.margin = "0";
    authoredStyles.top = "auto";
    authoredStyles.left = "auto";
    authoredStyles.right = "auto";
    authoredStyles.bottom = "auto";
    authoredStyles.float = "none";
    authoredStyles.clear = "none";
    authoredStyles["box-sizing"] = "border-box";
  }

  if (computed.position === "fixed") {
    authoredStyles.position = "absolute";
  }

  if (context.options.inlineImages) {
    await inlineAllBackgroundUrls(node, authoredStyles);
  }

  const serializedBeforePseudo = materializePseudoElement(node, "::before");
  if (serializedBeforePseudo) {
    let resolvedBefore = serializedBeforePseudo;
    if (hasCounterReferences(resolvedBefore)) {
      resolvedBefore = resolveCounterContent(resolvedBefore, node, context.counterContext);
    }
    serializedChildFragments.push(resolvedBefore);
  }

  const listMarkerHtml = materializeListMarker(node);
  if (listMarkerHtml) {
    serializedChildFragments.push(listMarkerHtml);
  }

  if (node instanceof HTMLCanvasElement) {
    const canvasDataUrl = captureCanvasAsDataUrl(node);
    if (canvasDataUrl) {
      const inlineStyle = stylesToInlineString(authoredStyles);
      return {
        html: `<img src="${escapeSrcAttributeValue(canvasDataUrl)}" width="${node.width}" height="${node.height}" style="${inlineStyle}">`,
        processedNodes: 1,
      };
    }
  }

  if (node instanceof HTMLVideoElement) {
    const videoFrameSrc = captureVideoFrame(node);
    if (videoFrameSrc) {
      const videoWidth = node.videoWidth || node.offsetWidth;
      const videoHeight = node.videoHeight || node.offsetHeight;
      authoredStyles["object-fit"] = "contain";
      const inlineStyle = stylesToInlineString(authoredStyles);
      return {
        html: `<img src="${escapeSrcAttributeValue(videoFrameSrc)}" width="${videoWidth}" height="${videoHeight}" style="${inlineStyle}">`,
        processedNodes: 1,
      };
    }
  }

  if (node instanceof HTMLInputElement) {
    const inputType = (node.type || "text").toLowerCase();

    if (inputType === "hidden") {
      return { html: "", processedNodes: 1 };
    }

    if (inputType === "range") {
      const rangeMin = parseFloat(node.min || "0");
      const rangeMax = parseFloat(node.max || "100");
      const rangeValue = parseFloat(node.value || "50");
      const rangePercentage = rangeMax > rangeMin
        ? ((rangeValue - rangeMin) / (rangeMax - rangeMin)) * 100
        : 50;
      const trackStyle = `width:100%;height:6px;background:linear-gradient(to right,#4caf50 ${rangePercentage}%,#e0e0e0 ${rangePercentage}%);border-radius:3px;`;
      const thumbStyle = `width:16px;height:16px;background:#fff;border:2px solid #4caf50;border-radius:50%;position:absolute;top:50%;left:${rangePercentage}%;transform:translate(-50%,-50%);`;
      const inlineStyle = stylesToInlineString(authoredStyles);
      return {
        html: `<div style="position:relative;display:flex;align-items:center;${inlineStyle}" ${SNAPSHOT_DATA_ATTRIBUTE}-original-tag="INPUT"><div style="${trackStyle}"></div><div style="${thumbStyle}"></div></div>`,
        processedNodes: 1,
      };
    }

    if (inputType === "color") {
      const colorValue = node.value || "#000000";
      const inlineStyle = stylesToInlineString(authoredStyles);
      return {
        html: `<div style="width:44px;height:22px;border:1px solid #ccc;border-radius:3px;background:${colorValue};${inlineStyle}" ${SNAPSHOT_DATA_ATTRIBUTE}-original-tag="INPUT"></div>`,
        processedNodes: 1,
      };
    }
  }

  if (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  ) {
    const inputState = captureInputState(node);

    const isCompactInput =
      node instanceof HTMLInputElement || node instanceof HTMLSelectElement;
    const isPasswordInput =
      node instanceof HTMLInputElement && node.type.toLowerCase() === "password";
    const displayValue =
      node instanceof HTMLSelectElement
        ? resolveSelectedOptionText(node)
        : isPasswordInput
          ? "\u2022".repeat(Math.min(node.value.length, 20))
          : node.value;
    const placeholderText =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? node.placeholder
        : undefined;
    const visibleText = displayValue || placeholderText || "";

    if (visibleText && isCompactInput) {
      authoredStyles.display = authoredStyles.display?.includes("inline")
        ? "inline-flex"
        : "flex";
      authoredStyles["align-items"] = "center";
    }

    if (visibleText) {
      const textStyles: Record<string, string> = {
        height: "fit-content",
        width: "100%",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "text-wrap-mode": "nowrap",
      };

      if (!displayValue && placeholderText) {
        const placeholderComputed = getComputedStyle(node, "::placeholder");
        textStyles.color = placeholderComputed.color;
        textStyles.opacity = placeholderComputed.opacity || "1";
      }

      serializedChildFragments.push(
        `<div style="${stylesToInlineString(textStyles)}">${escapeHtml(visibleText)}</div>`,
      );
    }

    if (inputState) {
      const stateAttributes = serializeInputStateAttributes(inputState);
      if (stateAttributes) {
        attributes.push(["data-input-state", stateAttributes]);
      }
    }
  }

  if (node instanceof HTMLImageElement) {
    const imageSource = resolveImageElementSource(node);
    if (context.options.inlineImages) {
      const inlinedSource = await deduplicatedFetchAsDataUrl(imageSource);
      attributes.push(["src", inlinedSource ?? imageSource]);
    } else {
      attributes.push(["src", imageSource]);
    }
  }

  if (node instanceof HTMLAnchorElement) {
    const hrefValue = node.getAttribute("href");
    if (hrefValue) {
      const sanitizedHref = sanitizeUrlAttribute("href", hrefValue);
      if (sanitizedHref) {
        attributes.push(["href", sanitizedHref]);
      }
    }
  }

  if (node instanceof HTMLOutputElement) {
    const outputValue = node.value || node.textContent || "";
    if (outputValue && !node.childNodes.length) {
      serializedChildFragments.push(escapeHtml(outputValue));
    }
  }

  if (node instanceof HTMLDetailsElement) {
    if (node.open) attributes.push(["open", ""]);
  }

  if (tagName === "dialog" && node.hasAttribute("open")) {
    attributes.push(["open", ""]);
  }

  const shadowResult = serializeShadowRoot(node);
  let childNodesToSerialize: Node[];

  if (shadowResult) {
    context.collectedShadowCss.push(shadowResult.scopedCss);
    childNodesToSerialize = shadowResult.childNodes;
  } else if (node instanceof HTMLSlotElement) {
    childNodesToSerialize = resolveSlotContent(node);
  } else {
    childNodesToSerialize = Array.from(node.childNodes);
  }

  for (const childNode of childNodesToSerialize) {
    const childNodesToProcess: Node[] = [];

    if (childNode instanceof SVGElement && childNode.tagName === "use") {
      const referencedElement = resolveSvgUseReferences(childNode, attributes, context.visitedUseIds);
      if (referencedElement) {
        if (referencedElement.tagName === "symbol" || referencedElement.tagName === "svg") {
          childNodesToProcess.push(...Array.from(referencedElement.childNodes));
        } else {
          childNodesToProcess.push(referencedElement);
        }
      }
    } else {
      childNodesToProcess.push(childNode);
    }

    for (const nodeToProcess of childNodesToProcess) {
      context.currentDepth++;
      context.totalNodesProcessed++;
      if (context.totalNodesProcessed % 100 === 0) {
        await yieldToMainThread();
      }
      const childResult = await serializeNode(
        nodeToProcess,
        context,
        false,
        processedNodeCount + totalProcessedNodes,
      );
      context.currentDepth--;
      totalProcessedNodes += childResult.processedNodes;
      serializedChildFragments.push(childResult.html);
    }
  }

  const serializedAfterPseudo = materializePseudoElement(node, "::after");
  if (serializedAfterPseudo) {
    let resolvedAfter = serializedAfterPseudo;
    if (hasCounterReferences(resolvedAfter)) {
      resolvedAfter = resolveCounterContent(resolvedAfter, node, context.counterContext);
    }
    serializedChildFragments.push(resolvedAfter);
  }

  materializeFirstLetter(node, serializedChildFragments);

  if (node instanceof SVGElement) {
    for (const attributeName of node.getAttributeNames()) {
      if (SNAPSHOT_SVG_SKIPPED_ATTRIBUTES.has(attributeName)) continue;
      const attributeValue = node.getAttribute(attributeName) || "";
      if (!attributeValue) continue;

      let resolvedValue = attributeValue;
      if (SNAPSHOT_SVG_COLOR_ATTRIBUTES.has(attributeName)) {
        if (resolvedValue.toLowerCase() === "currentcolor") {
          resolvedValue = authoredStyles[attributeName] || authoredStyles.color || resolvedValue;
        }
      }

      attributes.push([attributeName, resolvedValue.replaceAll('"', "'")]);
      if (!SNAPSHOT_SVG_DIMENSION_ATTRIBUTES.has(attributeName)) {
        delete authoredStyles[attributeName];
      }
    }
  }

  const shouldConvertToDiv =
    (SNAPSHOT_TABLE_LIKE_TAGS.has(tagName) || SNAPSHOT_INPUT_TAGS.has(tagName)) &&
    !SNAPSHOT_PRESERVED_SEMANTIC_TAGS.has(tagName);
  const outputTag = shouldConvertToDiv ? "div" : tagName;

  if (outputTag !== tagName) {
    attributes.push([`${SNAPSHOT_DATA_ATTRIBUTE}-original-tag`, node.tagName]);
  }

  if (Object.keys(authoredStyles).length > 0) {
    if (authoredStyles.width || authoredStyles.height) {
      authoredStyles.width ??= "auto";
      authoredStyles.height ??= "auto";
    }
    const inlineStyleString = stylesToInlineString(authoredStyles);
    const deduplicatedClassName = context.styleDeduplicator.getOrCreateClass(inlineStyleString);
    if (deduplicatedClassName) {
      attributes.push(["class", deduplicatedClassName]);
    }
  }

  if (node.parentElement) {
    adjustPositionedChildForScroll(node.parentElement, authoredStyles);
  }

  const sanitizedAttributes = sanitizeSerializedAttributes(attributes);
  const isVoidElement = SNAPSHOT_VOID_ELEMENTS.has(outputTag);

  const formattedAttributes = sanitizedAttributes
    .map(([name, value]) => {
      if (name === "src") {
        return `${name}="${escapeSrcAttributeValue(value)}"`;
      }
      return `${name}="${escapeAttributeValue(value)}"`;
    })
    .join(" ");

  if (isVoidElement) {
    return {
      html: `<${outputTag} ${formattedAttributes}>`,
      processedNodes: totalProcessedNodes,
    };
  }

  let combinedChildContent = serializedChildFragments.join("");

  const hasDisplayContents = authoredStyles.display === "contents";
  if (hasDisplayContents) {
    return { html: combinedChildContent, processedNodes: totalProcessedNodes };
  }

  combinedChildContent = preserveScrollPosition(node, combinedChildContent, authoredStyles);

  return {
    html: `<${outputTag} ${formattedAttributes}>${combinedChildContent}</${outputTag}>`,
    processedNodes: totalProcessedNodes,
  };
};

export const serializeElement = async (
  element: Element,
  options: SerializeElementOptions = {},
): Promise<SerializeResult> => {
  if (!element || !(element instanceof Element)) {
    return { status: "error", html: "", nodeCount: 0, fontsCss: "", shadowCss: "", scrollbarCss: "", elementCss: "", baseCss: "" };
  }

  precacheCommonTagDefaults();

  const undoLineClamp = stabilizeLineClamp(element);
  const undoContentVisibility = forceContentVisibility(element);
  const undoLayoutStabilization = stabilizeElementLayout(element);

  try {
    inlineExternalSvgDefs(element);
  } catch { /* non-blocking */ }

  try {
    const counterContext = buildCounterContext(element);
    const collectedShadowCss: string[] = [];

    const context: SerializeContext = {
      options,
      counterContext,
      collectedShadowCss,
      computedStyleCache: new WeakMap(),
      visitedUseIds: new Set(),
      currentDepth: 0,
      styleDeduplicator: createStyleDeduplicator(),
      totalNodesProcessed: 0,
    };

    const result = await serializeNode(element, context, true, 0);

    undoLineClamp();
    undoContentVisibility();
    undoLayoutStabilization();

    if (options.abortSignal?.aborted) {
      return { status: "aborted", html: "", nodeCount: 0, fontsCss: "", shadowCss: "", scrollbarCss: "", elementCss: "", baseCss: "" };
    }

    let fontsCss = "";
    if (options.embedFonts) {
      fontsCss = await embedUsedFonts(element);
    }

    const shadowCss = collectedShadowCss.join("\n");
    const scrollbarCss = collectScrollbarCss(element.ownerDocument);
    const elementCss = context.styleDeduplicator.generateCssBlock();
    const baseCss = generateBaseResetCss(element);

    return {
      status: "success",
      html: result.html,
      nodeCount: result.processedNodes,
      fontsCss,
      shadowCss,
      scrollbarCss,
      elementCss,
      baseCss,
    };
  } catch {
    undoLineClamp();
    undoContentVisibility();
    undoLayoutStabilization();
    return { status: "error", html: "", nodeCount: 0, fontsCss: "", shadowCss: "", scrollbarCss: "", elementCss: "", baseCss: "" };
  } finally {
    disposeSnapshotBaseline();
    disposeVarBaseline();
    resetShadowScopeCounter();
    clearInflightRequests();
  }
};
