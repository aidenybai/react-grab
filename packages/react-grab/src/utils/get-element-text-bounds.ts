import type { ElementBounds } from "../types.js";
import {
  BOUNDS_CACHE_TTL_MS,
  DRAG_SELECTION_MAX_TEXT_FLOW_NODES,
  DRAG_SELECTION_MAX_TEXT_NODES,
  DRAG_SELECTION_MAX_TEXT_RECTS,
} from "../constants.js";
import { convertClientPositionToTopWindow } from "./convert-client-position-to-top-window.js";
import { hasElementBoxPaint } from "./has-element-box-paint.js";
import { isElementNode } from "./is-element-node.js";
import { isHtmlElement } from "./is-html-element.js";

const BOX_SELECTION_ROOT_TAG_NAMES = new Set([
  "A",
  "AUDIO",
  "BUTTON",
  "CANVAS",
  "DETAILS",
  "EMBED",
  "IFRAME",
  "IMG",
  "INPUT",
  "METER",
  "OBJECT",
  "OPTION",
  "PROGRESS",
  "SELECT",
  "SUMMARY",
  "SVG",
  "TEXTAREA",
  "VIDEO",
]);

const BOX_SELECTION_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "gridcell",
  "link",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "scrollbar",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem",
]);

const INLINE_TEXT_TAG_NAMES = new Set([
  "A",
  "ABBR",
  "B",
  "BDI",
  "BDO",
  "BR",
  "CITE",
  "CODE",
  "DATA",
  "DEL",
  "DFN",
  "EM",
  "I",
  "INS",
  "KBD",
  "MARK",
  "Q",
  "S",
  "SAMP",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "TIME",
  "U",
  "VAR",
  "WBR",
]);

let textBoundsCache = new WeakMap<Element, ElementBounds[] | null>();
let textBoundsTimestampCache = new WeakMap<Element, number>();

export const invalidateElementTextBoundsCache = (): void => {
  textBoundsCache = new WeakMap<Element, ElementBounds[] | null>();
  textBoundsTimestampCache = new WeakMap<Element, number>();
};

const cacheTextBounds = (
  element: Element,
  bounds: ElementBounds[] | null,
  timestamp: number,
): ElementBounds[] | null => {
  textBoundsCache.set(element, bounds);
  textBoundsTimestampCache.set(element, timestamp);
  return bounds;
};

const usesBoxSelection = (element: Element): boolean =>
  BOX_SELECTION_ROOT_TAG_NAMES.has(element.tagName) ||
  BOX_SELECTION_ROLES.has(element.getAttribute("role") ?? "") ||
  (isHtmlElement(element) && element.isContentEditable);

export const getElementTextBounds = (element: Element): ElementBounds[] | null => {
  const now = performance.now();
  const cachedTimestamp = textBoundsTimestampCache.get(element);
  if (cachedTimestamp !== undefined && now - cachedTimestamp < BOUNDS_CACHE_TTL_MS) {
    return textBoundsCache.get(element) ?? null;
  }

  if (usesBoxSelection(element)) return cacheTextBounds(element, null, now);

  if (element.childNodes.length > DRAG_SELECTION_MAX_TEXT_FLOW_NODES) {
    return cacheTextBounds(element, null, now);
  }

  const textNodes: Node[] = [];
  const pendingNodes: Node[] = [];
  let inspectedNodeCount = 0;
  for (let childIndex = element.childNodes.length - 1; childIndex >= 0; childIndex -= 1) {
    pendingNodes.push(element.childNodes[childIndex]);
  }

  while (pendingNodes.length > 0) {
    inspectedNodeCount += 1;
    if (inspectedNodeCount > DRAG_SELECTION_MAX_TEXT_FLOW_NODES) {
      return cacheTextBounds(element, null, now);
    }

    const currentNode = pendingNodes.pop();
    if (!currentNode) continue;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      if (currentNode.textContent?.trim()) {
        textNodes.push(currentNode);
        if (textNodes.length > DRAG_SELECTION_MAX_TEXT_NODES) {
          return cacheTextBounds(element, null, now);
        }
      }
      continue;
    }
    if (!isElementNode(currentNode) || !INLINE_TEXT_TAG_NAMES.has(currentNode.tagName)) {
      return cacheTextBounds(element, null, now);
    }
    if (
      inspectedNodeCount + pendingNodes.length + currentNode.childNodes.length >
      DRAG_SELECTION_MAX_TEXT_FLOW_NODES
    ) {
      return cacheTextBounds(element, null, now);
    }
    for (let childIndex = currentNode.childNodes.length - 1; childIndex >= 0; childIndex -= 1) {
      pendingNodes.push(currentNode.childNodes[childIndex]);
    }
  }

  if (textNodes.length === 0) return cacheTextBounds(element, null, now);
  if (hasElementBoxPaint(element)) return cacheTextBounds(element, null, now);

  try {
    const range = element.ownerDocument.createRange();
    const topWindowOrigin = convertClientPositionToTopWindow(
      element.ownerDocument.defaultView,
      0,
      0,
    );
    const textBounds: ElementBounds[] = [];
    for (const textNode of textNodes) {
      range.selectNodeContents(textNode);
      const clientRects = range.getClientRects();
      if (textBounds.length + clientRects.length > DRAG_SELECTION_MAX_TEXT_RECTS) {
        return cacheTextBounds(element, null, now);
      }
      for (let rectIndex = 0; rectIndex < clientRects.length; rectIndex += 1) {
        const clientRect = clientRects[rectIndex];
        const width = clientRect.width * topWindowOrigin.scaleX;
        const height = clientRect.height * topWindowOrigin.scaleY;
        if (
          !Number.isFinite(clientRect.left) ||
          !Number.isFinite(clientRect.top) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width <= 0 ||
          height <= 0
        ) {
          continue;
        }
        textBounds.push({
          borderRadius: "0px",
          height,
          width,
          x: topWindowOrigin.x + clientRect.left * topWindowOrigin.scaleX,
          y: topWindowOrigin.y + clientRect.top * topWindowOrigin.scaleY,
        });
      }
    }
    return cacheTextBounds(element, textBounds.length > 0 ? textBounds : null, now);
  } catch {
    return cacheTextBounds(element, null, now);
  }
};
