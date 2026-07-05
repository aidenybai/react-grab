import {
  CLONE_PROTOTYPE_CACHE_CAP,
  DEFAULT_ACCENT_COLOR,
  IFRAME_PLACEHOLDER_BACKGROUND_COLOR,
  SVG_NAMESPACE_URI,
  SVG_PAINT_PRESENTATION_ATTRIBUTES,
  SVG_TEMPLATE_CONTAINER_TAGS,
  TRANSPARENT_PIXEL_DATA_URL,
  XHTML_NAMESPACE_URI,
} from "../constants";
import type { CloneContext, StyleDeclarationMap } from "../types";
import { buildIndeterminateCheckboxStyle } from "../utils/build-indeterminate-checkbox-style";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { isHtmlElementOfTag } from "../utils/is-html-element-of-tag";
import { parsePx } from "../utils/parse-px";
import { resolveUrl } from "../utils/resolve-url";
import { sanitizeSvgSubtreeForSerialization } from "../utils/sanitize-svg-subtree";
import { selectSrcsetCandidate } from "../utils/select-srcset-candidate";
import { stripInvalidXmlCharacters } from "../utils/strip-invalid-xml-characters";
import { freezeFixedDescendants } from "./freeze-fixed";
import { freezeStickyDescendants } from "./freeze-sticky";
import { applyScrollOffsets } from "./scroll-offsets";

const PLAIN_XML_ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const REMOVED_ATTRIBUTE_NAMES = new Set(["class", "style", "srcset", "sizes", "loading", "slot"]);

// Tags whose clones get replica-specific attributes (form state reflection or
// freeze replicas) and so can never share a prototype.
const PROTOTYPE_EXCLUDED_TAGS = new Set(["input", "select", "option", "textarea"]);

// Solid-style template instantiation: the typical clone is tag + emitted
// class + carried inline text with every source attribute dropped, so one
// prototype per (tag, class, carry) combination is built once and stamped out
// with cloneNode, replacing per-element createElement + setAttribute pairs.
const clonePrototypeByKey = new Map<string, Element>();

// NamedNodeMap.length plus targeted hasAttribute probes avoid both the
// per-element array getAttributeNames allocates and materializing lazy Attr
// nodes via NamedNodeMap indexing.
const hasOnlyDroppedAttributes = (element: Element): boolean => {
  if (!element.hasAttributes()) return true;
  const attributeCount = element.attributes.length;
  if (attributeCount > 2) return false;
  let droppedCount = element.hasAttribute("class") ? 1 : 0;
  if (element.hasAttribute("style")) droppedCount += 1;
  return droppedCount === attributeCount;
};

const attributeNameValidityCache = new Map<string, boolean>();

const isPlainXmlAttributeName = (attributeName: string): boolean => {
  let isValid = attributeNameValidityCache.get(attributeName);
  if (isValid === undefined) {
    isValid = PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attributeName);
    attributeNameValidityCache.set(attributeName, isValid);
  }
  return isValid;
};

const isSerializableAttribute = (attribute: Attr): boolean => {
  if (attribute.namespaceURI === null) {
    return attribute.name !== "xmlns" && isPlainXmlAttributeName(attribute.name);
  }
  return (
    (attribute.prefix === null || PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attribute.prefix)) &&
    PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attribute.localName)
  );
};

const sanitizeCloneAttributes = (clone: Element): void => {
  const attributes = clone.attributes;
  for (let attributeIndex = attributes.length - 1; attributeIndex >= 0; attributeIndex--) {
    const attribute = attributes[attributeIndex];
    if (REMOVED_ATTRIBUTE_NAMES.has(attribute.name) || !isSerializableAttribute(attribute)) {
      clone.removeAttributeNode(attribute);
      continue;
    }
    const sanitizedValue = stripInvalidXmlCharacters(attribute.value);
    if (sanitizedValue !== attribute.value) attribute.value = sanitizedValue;
  }
};

// Cheaper than cloneNode(false) + sanitize for typical elements: the class
// attribute (usually the only one) is dropped anyway, so building an empty
// element and copying just the serializable attributes skips the copy-then-
// remove churn.
const createSanitizedClone = (element: Element, ownerDocument: Document): Element => {
  const clone =
    element.namespaceURI === XHTML_NAMESPACE_URI && element.prefix === null
      ? ownerDocument.createElement(element.localName)
      : ownerDocument.createElementNS(
          element.namespaceURI,
          element.prefix === null ? element.localName : `${element.prefix}:${element.localName}`,
        );
  const attributes = element.attributes;
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
    const attribute = attributes[attributeIndex];
    if (REMOVED_ATTRIBUTE_NAMES.has(attribute.name) || !isSerializableAttribute(attribute)) {
      continue;
    }
    clone.setAttributeNS(
      attribute.namespaceURI,
      attribute.name,
      stripInvalidXmlCharacters(attribute.value),
    );
  }
  return clone;
};

const isSvgTemplateContainer = (element: Element): boolean =>
  element.namespaceURI === SVG_NAMESPACE_URI && SVG_TEMPLATE_CONTAINER_TAGS.has(element.localName);

// Presentation attributes sit below class rules in the cascade, but our diffed
// classes omit properties equal to the UA default, which would let a stale
// attribute (e.g. fill="red" overridden by CSS) win inside the capture.
const stripSvgPaintPresentationAttributes = (clone: Element): void => {
  for (const attributeName of SVG_PAINT_PRESENTATION_ATTRIBUTES) {
    if (clone.hasAttribute(attributeName)) clone.removeAttribute(attributeName);
  }
};

const freezeImage = (image: HTMLImageElement): Element | null => {
  const cloned = image.cloneNode(false);
  if (!isElementNode(cloned)) return null;
  let frozenSrc = image.currentSrc || image.src;
  if (!frozenSrc && image.srcset) {
    const srcsetCandidateUrl = selectSrcsetCandidate(
      image.srcset,
      image.offsetWidth,
      image.ownerDocument.defaultView?.devicePixelRatio ?? 1,
    );
    if (srcsetCandidateUrl) frozenSrc = resolveUrl(srcsetCandidateUrl, image.baseURI);
  }
  if (frozenSrc) cloned.setAttribute("src", frozenSrc);
  return cloned;
};

const freezeCanvas = (canvas: HTMLCanvasElement, ownerDocument: Document): Element => {
  const frozenImage = ownerDocument.createElement("img");
  frozenImage.setAttribute("width", String(canvas.width));
  frozenImage.setAttribute("height", String(canvas.height));
  try {
    frozenImage.setAttribute("src", canvas.toDataURL());
  } catch {
    frozenImage.setAttribute("src", TRANSPARENT_PIXEL_DATA_URL);
  }
  return frozenImage;
};

const freezeVideo = (
  video: HTMLVideoElement,
  ownerDocument: Document,
  styles: StyleDeclarationMap,
): Element => {
  const frozenImage = ownerDocument.createElement("img");
  let frozenSrc = "";
  if (video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const scratchCanvas = ownerDocument.createElement("canvas");
    scratchCanvas.width = video.videoWidth;
    scratchCanvas.height = video.videoHeight;
    const scratchContext = scratchCanvas.getContext("2d");
    if (scratchContext) {
      try {
        scratchContext.drawImage(video, 0, 0);
        frozenSrc = scratchCanvas.toDataURL();
      } catch {
        frozenSrc = "";
      }
    }
    frozenImage.setAttribute("width", String(video.videoWidth));
    frozenImage.setAttribute("height", String(video.videoHeight));
    scratchCanvas.width = 0;
    scratchCanvas.height = 0;
  }
  if (!frozenSrc) frozenSrc = video.poster || TRANSPARENT_PIXEL_DATA_URL;
  frozenImage.setAttribute("src", frozenSrc);
  // The video-to-img swap invalidates the baseline diff for object-fit: the UA
  // gives <video> object-fit:contain while <img> defaults to fill, so the
  // poster/frame fitting must be pinned inline.
  frozenImage.setAttribute(
    "style",
    `object-fit:${styles["object-fit"] ?? "contain"};` +
      `object-position:${styles["object-position"] ?? "50% 50%"};`,
  );
  return frozenImage;
};

const reflectFormState = (element: Element, clone: Element, styles: StyleDeclarationMap): void => {
  if (isHtmlElementOfTag(element, "input")) {
    clone.setAttribute("value", element.value);
    if (element.checked) clone.setAttribute("checked", "");
    else clone.removeAttribute("checked");
    if (element.type === "checkbox" && element.indeterminate) {
      const accentColorValue = styles["accent-color"];
      clone.setAttribute(
        "style",
        buildIndeterminateCheckboxStyle(
          parsePx(styles["width"]),
          parsePx(styles["height"]),
          accentColorValue && accentColorValue !== "auto" ? accentColorValue : DEFAULT_ACCENT_COLOR,
        ),
      );
    }
  } else if (isHtmlElementOfTag(element, "option")) {
    if (element.selected) clone.setAttribute("selected", "");
    else clone.removeAttribute("selected");
  }
};

const hasVisibleOverflowOnly = (
  overflowX: string | undefined,
  overflowY: string | undefined,
): boolean =>
  (overflowX === undefined || overflowX === "visible") &&
  (overflowY === undefined || overflowY === "visible");

const buildIframeClone = (element: HTMLIFrameElement, context: CloneContext): Element => {
  const clone = context.ownerDocument.createElement("div");
  const iframeContent = context.iframeContentByElement.get(element);
  if (iframeContent) {
    const canvasBackground = iframeContent.canvasBackgroundColor
      ? `background:${iframeContent.canvasBackgroundColor};`
      : "";
    clone.setAttribute("style", `overflow:hidden;${canvasBackground}`);
    const contentImage = context.ownerDocument.createElement("img");
    contentImage.setAttribute("src", iframeContent.pngDataUrl);
    contentImage.setAttribute(
      "style",
      `display:block;width:${iframeContent.widthPx}px;height:${iframeContent.heightPx}px;`,
    );
    clone.appendChild(contentImage);
  } else {
    clone.setAttribute("style", `background:${IFRAME_PLACEHOLDER_BACKGROUND_COLOR};`);
  }
  return clone;
};

const appendChildClone = (
  clone: Element,
  childNode: Node,
  context: CloneContext,
  isInShadowTree: boolean,
): void => {
  if (isElementNode(childNode)) {
    const childClone = cloneElementNode(childNode, context, isInShadowTree);
    if (childClone) clone.appendChild(childClone);
  } else if (childNode.nodeType === Node.TEXT_NODE) {
    clone.appendChild(
      context.ownerDocument.createTextNode(stripInvalidXmlCharacters(childNode.textContent ?? "")),
    );
  }
};

const cloneElementNode = (
  element: Element,
  context: CloneContext,
  isInShadowTree = false,
): Element | null => {
  if (isSvgTemplateContainer(element)) {
    const verbatimClone = element.cloneNode(true);
    if (!isElementNode(verbatimClone)) return null;
    sanitizeSvgSubtreeForSerialization(verbatimClone);
    return verbatimClone;
  }
  const snapshot = context.snapshotByElement.get(element);
  if (!snapshot) return null;
  const isXhtmlElement = element.namespaceURI === XHTML_NAMESPACE_URI && element.prefix === null;
  const tagName = isXhtmlElement ? element.localName : "";
  let clone: Element | null;
  let shouldCloneChildren = true;
  let isPrototypeClone = false;
  if (tagName === "iframe" && isHtmlElementOfTag(element, "iframe")) {
    clone = buildIframeClone(element, context);
    shouldCloneChildren = false;
  } else if (tagName === "canvas" && isHtmlElementOfTag(element, "canvas")) {
    clone = freezeCanvas(element, context.ownerDocument);
    shouldCloneChildren = false;
  } else if (tagName === "video" && isHtmlElementOfTag(element, "video")) {
    clone = freezeVideo(element, context.ownerDocument, snapshot.styles);
    shouldCloneChildren = false;
  } else if (tagName === "img" && isHtmlElementOfTag(element, "img")) {
    clone = freezeImage(element);
    if (clone) sanitizeCloneAttributes(clone);
    shouldCloneChildren = false;
  } else if (tagName === "textarea") {
    clone = createSanitizedClone(element, context.ownerDocument);
    shouldCloneChildren = false;
  } else if (
    isXhtmlElement &&
    !PROTOTYPE_EXCLUDED_TAGS.has(tagName) &&
    hasOnlyDroppedAttributes(element)
  ) {
    const prototypeClassName = context.classNameByElement.get(element) ?? "";
    const prototypeCarryText = context.inlineCarryTextByElement.get(element) ?? "";
    if (prototypeClassName === "" && prototypeCarryText === "") {
      clone = context.ownerDocument.createElement(element.localName);
    } else {
      const prototypeKey = `${element.localName}|${prototypeClassName}|${prototypeCarryText}`;
      let prototypeElement = clonePrototypeByKey.get(prototypeKey);
      if (prototypeElement === undefined) {
        prototypeElement = context.ownerDocument.createElement(element.localName);
        if (prototypeClassName !== "") {
          prototypeElement.setAttribute("class", prototypeClassName);
        }
        if (prototypeCarryText !== "") {
          prototypeElement.setAttribute("style", prototypeCarryText);
        }
        if (clonePrototypeByKey.size >= CLONE_PROTOTYPE_CACHE_CAP) {
          clonePrototypeByKey.clear();
        }
        clonePrototypeByKey.set(prototypeKey, prototypeElement);
      }
      const stampedClone = prototypeElement.cloneNode(false);
      clone = isElementNode(stampedClone) ? stampedClone : null;
      isPrototypeClone = true;
    }
  } else {
    clone = createSanitizedClone(element, context.ownerDocument);
  }
  if (!clone) return null;
  if (context.prunedElements?.has(element)) shouldCloneChildren = false;
  if (tagName === "input" || tagName === "option") {
    reflectFormState(element, clone, snapshot.styles);
  }
  const inlineCarryText = isPrototypeClone
    ? undefined
    : context.inlineCarryTextByElement.get(element);
  if (inlineCarryText !== undefined) {
    // Prepending keeps replica-specific inline styling (indeterminate
    // checkbox dash, frozen video fitting) winning over carried props.
    const existingStyleText = clone.getAttribute("style");
    clone.setAttribute(
      "style",
      existingStyleText ? inlineCarryText + existingStyleText : inlineCarryText,
    );
  }
  const className = isPrototypeClone ? undefined : context.classNameByElement.get(element);
  if (className) clone.setAttribute("class", className);
  if (className && element.namespaceURI === SVG_NAMESPACE_URI) {
    stripSvgPaintPresentationAttributes(clone);
  }
  if (tagName === "textarea" && isHtmlElementOfTag(element, "textarea")) {
    clone.textContent = stripInvalidXmlCharacters(element.value);
  }
  context.cloneByElement.set(element, clone);
  if (shouldCloneChildren) {
    const childIsInShadowTree = isInShadowTree || Boolean(element.shadowRoot);
    const onlyChildNode = element.firstChild;
    if (
      !childIsInShadowTree &&
      onlyChildNode !== null &&
      onlyChildNode === element.lastChild &&
      onlyChildNode.nodeType === Node.TEXT_NODE
    ) {
      clone.textContent = stripInvalidXmlCharacters(onlyChildNode.textContent ?? "");
    } else if (!childIsInShadowTree) {
      for (
        let childNode = element.firstChild;
        childNode !== null;
        childNode = childNode.nextSibling
      ) {
        appendChildClone(clone, childNode, context, false);
      }
    } else {
      for (const childNode of getComposedChildNodes(element, childIsInShadowTree)) {
        appendChildClone(clone, childNode, context, childIsInShadowTree);
      }
    }
  }
  const hasScrollOffset = snapshot.scrollLeft !== 0 || snapshot.scrollTop !== 0;
  if (
    hasScrollOffset &&
    !hasVisibleOverflowOnly(snapshot.styles["overflow-x"], snapshot.styles["overflow-y"])
  ) {
    applyScrollOffsets(clone, snapshot.scrollLeft, snapshot.scrollTop, context.ownerDocument);
    freezeStickyDescendants(element, context);
  }
  return clone;
};

export const cloneComposedTree = (rootElement: Element, context: CloneContext): Element | null => {
  const clone = cloneElementNode(rootElement, context);
  if (clone) freezeFixedDescendants(rootElement, context);
  return clone;
};
