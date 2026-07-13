import { isAcceptedAttr, findUniqueSelector } from "./find-unique-selector.js";
import { FINDER_TIMEOUT_MS, SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS } from "../constants.js";
import { getWindowFrameElement } from "./get-window-frame-element.js";
import { isShadowRoot } from "./is-shadow-root.js";
import { isElementNode } from "./is-element-node.js";

const getFinderRoot = (element: Element): Element =>
  element.ownerDocument.body ?? element.ownerDocument.documentElement;

const PREFERRED_SELECTOR_ATTRIBUTE_NAMES = new Set<string>([
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
  "aria-label",
  "href",
  "src",
  "role",
  "name",
  "title",
  "alt",
]);

const isPreferredAttributeValueSafe = (value: string): boolean =>
  value.length > 0 && value.length <= SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS;

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

const createFastElementSelector = (element: Element): string | null => {
  const elementId = element.getAttribute("id");
  if (elementId) {
    const idSelector = `#${CSS.escape(elementId)}`;
    if (isSelectorUniqueForElement(element, idSelector)) return idSelector;
  }

  for (const attributeName of PREFERRED_SELECTOR_ATTRIBUTE_NAMES) {
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;
    if (!isPreferredAttributeValueSafe(attributeValue)) continue;

    const quotedValue = JSON.stringify(attributeValue);

    const attributeOnlySelector = `[${attributeName}=${quotedValue}]`;
    if (isSelectorUniqueForElement(element, attributeOnlySelector)) {
      return attributeOnlySelector;
    }

    const tagSelector = `${element.tagName.toLowerCase()}${attributeOnlySelector}`;
    if (isSelectorUniqueForElement(element, tagSelector)) {
      return tagSelector;
    }
  }

  return null;
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

const createLocalElementSelector = (element: Element): string => {
  const fastSelector = createFastElementSelector(element);
  if (fastSelector) return fastSelector;

  try {
    const selector = findUniqueSelector(
      element,
      getFinderRoot(element),
      FINDER_TIMEOUT_MS,
      (attributeName, attributeValue) =>
        isAcceptedAttr(attributeName, attributeValue) ||
        (PREFERRED_SELECTOR_ATTRIBUTE_NAMES.has(attributeName) &&
          isPreferredAttributeValueSafe(attributeValue)),
    );
    if (selector) return selector;
    // @medv/finder can throw on unusual DOM structures (SVG, web components,
    // detached nodes), so we fall back to an nth-child selector instead.
  } catch {}

  return createNthChildSelector(element);
};

export const createElementSelector = (element: Element): string => {
  const localSelector = createLocalElementSelector(element);
  const rootNode = element.getRootNode();
  if (isShadowRoot(rootNode)) {
    return `${createElementSelector(rootNode.host)} >>> ${localSelector}`;
  }

  const frameElement = getWindowFrameElement(element.ownerDocument.defaultView);
  return frameElement
    ? `${createElementSelector(frameElement)} >>iframe>> ${localSelector}`
    : localSelector;
};
