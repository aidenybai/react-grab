import { attr as defaultAttr, finder } from "@medv/finder";
import {
  FINDER_TIMEOUT_MS,
  SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS,
} from "../constants.js";

const escapeCssIdentifier = (value: string): string => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
};

const getFinderRoot = (element: Element): Element =>
  element.ownerDocument.body ?? element.ownerDocument.documentElement;

const PREFERRED_SELECTOR_ATTRIBUTE_NAMES = new Set<string>([
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
  "aria-label",
  "role",
  "name",
  "title",
  "alt",
]);

const isPreferredAttributeValueSafe = (value: string): boolean =>
  value.length > 0 && value.length <= SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS;

const isSelectorUniqueForElement = (
  element: Element,
  selector: string,
): boolean => {
  try {
    const matchingElements = element.ownerDocument.querySelectorAll(selector);
    return matchingElements.length === 1 && matchingElements[0] === element;
  } catch {
    return false;
  }
};

const createFastElementSelector = (element: Element): string | null => {
  if (element instanceof HTMLElement && element.id) {
    const idSelector = `#${escapeCssIdentifier(element.id)}`;
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
  const root = getFinderRoot(element);

  let currentElement: Element | null = element;
  while (currentElement) {
    if (currentElement instanceof HTMLElement && currentElement.id) {
      segments.unshift(`#${escapeCssIdentifier(currentElement.id)}`);
      break;
    }

    const parentElement: HTMLElement | null = currentElement.parentElement;
    if (!parentElement) {
      segments.unshift(currentElement.tagName.toLowerCase());
      break;
    }

    const siblings = Array.from(parentElement.children);
    const siblingIndex = siblings.indexOf(currentElement);
    const nthChild = siblingIndex >= 0 ? siblingIndex + 1 : 1;

    segments.unshift(
      `${currentElement.tagName.toLowerCase()}:nth-child(${nthChild})`,
    );

    if (parentElement === root) {
      segments.unshift(root.tagName.toLowerCase());
      break;
    }

    currentElement = parentElement;
  }

  return segments.join(" > ");
};

export const createElementSelector = (
  element: Element,
  shouldUseFinder = true,
): string => {
  const fastSelector = createFastElementSelector(element);
  if (fastSelector) return fastSelector;

  if (shouldUseFinder) {
    try {
      const selector = finder(element, {
        root: getFinderRoot(element),
        timeoutMs: FINDER_TIMEOUT_MS,
        attr: (attributeName, attributeValue) =>
          defaultAttr(attributeName, attributeValue) ||
          (PREFERRED_SELECTOR_ATTRIBUTE_NAMES.has(attributeName) &&
            isPreferredAttributeValueSafe(attributeValue)),
      });
      if (selector) return selector;
      // HACK: @medv/finder can throw on edge-case DOM structures
    } catch {}
  }

  return createNthChildSelector(element);
};
