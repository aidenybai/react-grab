import { isAcceptedAttr, findUniqueSelector } from "./find-unique-selector.js";
import { FINDER_TIMEOUT_MS, SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS } from "../constants.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";
import { isShadowRoot } from "./is-shadow-root.js";
import { isElementNode } from "./is-element-node.js";
import { getElementAdapter } from "../core/element-adapter.js";
import { isStableElementId } from "./is-stable-element-id.js";
import { PREFERRED_SELECTOR_ATTRIBUTE_NAMES } from "./preferred-selector-attribute-names.js";
import { ACTIONABLE_SELECTOR_ROLES } from "./actionable-selector-roles.js";

export interface ElementSelectorDetails {
  selector: string;
  isSemantic: boolean;
}

const getFinderRoot = (element: Element): Element =>
  element.ownerDocument.body ?? element.ownerDocument.documentElement;

const isPreferredAttributeValueSafe = (value: string): boolean =>
  value.length > 0 && value.length <= SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS;

const isPreferredSelectorAttribute = (attributeName: string, attributeValue: string): boolean =>
  PREFERRED_SELECTOR_ATTRIBUTE_NAMES.has(attributeName) &&
  isPreferredAttributeValueSafe(attributeValue) &&
  (attributeName !== "role" ||
    attributeValue.split(/\s+/).some((role) => ACTIONABLE_SELECTOR_ROLES.has(role)));

const isSelectorUniqueForElement = (element: Element, selector: string): boolean => {
  try {
    const rootNode = element.getRootNode();
    const selectorRoot = isShadowRoot(rootNode) ? rootNode : element.ownerDocument;
    const matchingElements = selectorRoot.querySelectorAll(selector);
    return matchingElements.length === 1 && matchingElements[0] === element;
  } catch {
    return false;
  }
};

const createFastElementSelector = (element: Element): ElementSelectorDetails | null => {
  const elementId = element.getAttribute("id");
  let fallbackIdSelector: string | null = null;
  if (elementId) {
    const idSelector = `#${CSS.escape(elementId)}`;
    if (isSelectorUniqueForElement(element, idSelector)) {
      if (isStableElementId(elementId)) return { selector: idSelector, isSemantic: true };
      fallbackIdSelector = idSelector;
    }
  }

  for (const attributeName of PREFERRED_SELECTOR_ATTRIBUTE_NAMES) {
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;
    if (!isPreferredSelectorAttribute(attributeName, attributeValue)) continue;

    const quotedValue = JSON.stringify(attributeValue);

    const attributeOnlySelector = `[${attributeName}=${quotedValue}]`;
    if (isSelectorUniqueForElement(element, attributeOnlySelector)) {
      return { selector: attributeOnlySelector, isSemantic: true };
    }

    const tagSelector = `${element.tagName.toLowerCase()}${attributeOnlySelector}`;
    if (isSelectorUniqueForElement(element, tagSelector)) {
      return { selector: tagSelector, isSemantic: true };
    }
  }

  return fallbackIdSelector ? { selector: fallbackIdSelector, isSemantic: false } : null;
};

const createNthChildSelector = (element: Element): string => {
  const segments: string[] = [];
  const rootNode = element.getRootNode();
  const root = isShadowRoot(rootNode) ? rootNode : getFinderRoot(element);

  let currentElement: Element | null = element;
  while (currentElement) {
    const currentElementId = currentElement.getAttribute("id");
    if (currentElementId) {
      segments.unshift(`#${CSS.escape(currentElementId)}`);
      break;
    }

    const parentNode: ParentNode | null = currentElement.parentNode;
    if (!parentNode) {
      segments.unshift(currentElement.tagName.toLowerCase());
      break;
    }

    const siblings = Array.from(parentNode.children);
    const nthChild = siblings.indexOf(currentElement) + 1;

    segments.unshift(`${currentElement.tagName.toLowerCase()}:nth-child(${nthChild})`);

    if (parentNode === root) {
      if (isElementNode(root)) segments.unshift(root.tagName.toLowerCase());
      break;
    }

    currentElement = isElementNode(parentNode) ? parentNode : null;
  }

  return segments.join(" > ");
};

const createLocalElementSelector = (element: Element): ElementSelectorDetails => {
  const fastSelector = createFastElementSelector(element);
  if (fastSelector) return fastSelector;

  try {
    const selector = findUniqueSelector(
      element,
      getFinderRoot(element),
      FINDER_TIMEOUT_MS,
      (attributeName, attributeValue) =>
        isAcceptedAttr(attributeName, attributeValue) ||
        isPreferredSelectorAttribute(attributeName, attributeValue),
    );
    if (selector) return { selector, isSemantic: false };
    // @medv/finder can throw on unusual DOM structures (SVG, web components,
    // detached nodes), so we fall back to an nth-child selector instead.
  } catch {}

  return { selector: createNthChildSelector(element), isSemantic: false };
};

export const createSemanticElementSelectorDetails = (
  element: Element,
): ElementSelectorDetails | null => {
  const adapter = getElementAdapter(element);
  if (adapter) return { selector: adapter.getSelector(), isSemantic: true };

  const localSelector = createFastElementSelector(element);
  if (!localSelector?.isSemantic) return null;

  const rootNode = element.getRootNode();
  if (isShadowRoot(rootNode)) {
    const hostSelector = createSemanticElementSelectorDetails(rootNode.host);
    if (!hostSelector) return null;
    return {
      selector: `${hostSelector.selector} >>> ${localSelector.selector}`,
      isSemantic: true,
    };
  }

  const frameElement = getWindowFrameElement(element.ownerDocument.defaultView);
  if (!frameElement) return localSelector;

  const frameSelector = createSemanticElementSelectorDetails(frameElement);
  if (!frameSelector) return null;
  return {
    selector: `${frameSelector.selector} >>iframe>> ${localSelector.selector}`,
    isSemantic: true,
  };
};

export const createElementSelectorDetails = (element: Element): ElementSelectorDetails => {
  const adapter = getElementAdapter(element);
  if (adapter) return { selector: adapter.getSelector(), isSemantic: true };
  const localSelector = createLocalElementSelector(element);
  const rootNode = element.getRootNode();
  if (isShadowRoot(rootNode)) {
    const hostSelector = createElementSelectorDetails(rootNode.host);
    return {
      selector: `${hostSelector.selector} >>> ${localSelector.selector}`,
      isSemantic: hostSelector.isSemantic && localSelector.isSemantic,
    };
  }

  const frameElement = getWindowFrameElement(element.ownerDocument.defaultView);
  if (!frameElement) return localSelector;

  const frameSelector = createElementSelectorDetails(frameElement);
  return {
    selector: `${frameSelector.selector} >>iframe>> ${localSelector.selector}`,
    isSemantic: frameSelector.isSemantic && localSelector.isSemantic,
  };
};

export const createElementSelector = (element: Element): string =>
  createElementSelectorDetails(element).selector;
