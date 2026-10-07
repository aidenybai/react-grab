import { MAX_SELECTOR_COMBINATIONS } from "../constants.js";
import { NonElementNodeError, SelectorNotFoundError, SelectorTimeoutError } from "../errors.js";
import { isDocumentNode } from "./is-document-node.js";
import { isElementNode } from "./is-element-node.js";
import { isShadowRoot } from "./is-shadow-root.js";

interface SelectorNode {
  name: string;
  penalty: number;
}

const SEED_MIN_LENGTH = 3;
const ATTR_VALUE_MAX_LENGTH_CHARS = 100;

const PENALTY_ID = 0;
const PENALTY_CLASS = 1;
const PENALTY_ATTR = 2;
const PENALTY_TAG = 5;
const PENALTY_NTH_OF_TYPE = 10;
const PENALTY_NTH_CHILD = 50;

const ACCEPTED_ATTR_NAMES = new Set(["role", "name", "aria-label", "rel", "href"]);

const isWordLike = (text: string): boolean => {
  if (!/^[a-z-]{3,}$/i.test(text)) return false;
  const segments = text.split(/-|[A-Z]/);
  for (const segment of segments) {
    if (segment.length <= 2) return false;
    if (/[^aeiou]{4,}/i.test(segment)) return false;
  }
  return true;
};

export const isAcceptedAttr = (attributeName: string, attributeValue: string): boolean => {
  const nameIsAccepted =
    ACCEPTED_ATTR_NAMES.has(attributeName) ||
    (attributeName.startsWith("data-") && isWordLike(attributeName));
  const valueIsAccepted =
    (isWordLike(attributeValue) && attributeValue.length < ATTR_VALUE_MAX_LENGTH_CHARS) ||
    (attributeValue.startsWith("#") && isWordLike(attributeValue.slice(1)));
  return nameIsAccepted && valueIsAccepted;
};

const buildSelectorString = (path: SelectorNode[]): string => {
  let result = path[0].name;
  for (let index = 1; index < path.length; index++) {
    result = `${path[index].name} > ${result}`;
  }
  return result;
};

const calculatePenalty = (path: SelectorNode[]): number => {
  let total = 0;
  for (const selectorNode of path) {
    total += selectorNode.penalty;
  }
  return total;
};

const comparePenalty = (pathA: SelectorNode[], pathB: SelectorNode[]): number =>
  calculatePenalty(pathA) - calculatePenalty(pathB);

const getChildIndex = (element: Element, filterTagName?: string): number | undefined => {
  const parentNode = element.parentNode;
  if (!parentNode) return undefined;

  let sibling = parentNode.firstChild;
  if (!sibling) return undefined;

  let position = 0;
  while (sibling) {
    if (
      isElementNode(sibling) &&
      (filterTagName === undefined || sibling.tagName.toLowerCase() === filterTagName)
    ) {
      position++;
    }
    if (sibling === element) break;
    sibling = sibling.nextSibling;
  }
  return position;
};

const formatNthChild = (tagName: string, childPosition: number): string =>
  tagName === "html" ? "html" : `${tagName}:nth-child(${childPosition})`;

const formatNthOfType = (tagName: string, typePosition: number): string =>
  tagName === "html" ? "html" : `${tagName}:nth-of-type(${typePosition})`;

const collectCandidateNodes = (
  element: Element,
  attrFilter: (name: string, value: string) => boolean,
): SelectorNode[] => {
  const candidates: SelectorNode[] = [];
  const elementId = element.getAttribute("id");
  const elementTagName = element.tagName.toLowerCase();

  if (elementId && isWordLike(elementId)) {
    candidates.push({
      name: `#${CSS.escape(elementId)}`,
      penalty: PENALTY_ID,
    });
  }

  for (const className of element.classList) {
    if (isWordLike(className)) {
      candidates.push({
        name: `.${CSS.escape(className)}`,
        penalty: PENALTY_CLASS,
      });
    }
  }

  for (const attribute of element.attributes) {
    if (attrFilter(attribute.name, attribute.value)) {
      candidates.push({
        name: `[${CSS.escape(attribute.name)}="${CSS.escape(attribute.value)}"]`,
        penalty: PENALTY_ATTR,
      });
    }
  }

  candidates.push({ name: elementTagName, penalty: PENALTY_TAG });

  const typePosition = getChildIndex(element, elementTagName);
  if (typePosition !== undefined) {
    candidates.push({
      name: formatNthOfType(elementTagName, typePosition),
      penalty: PENALTY_NTH_OF_TYPE,
    });
  }

  const childPosition = getChildIndex(element);
  if (childPosition !== undefined) {
    candidates.push({
      name: formatNthChild(elementTagName, childPosition),
      penalty: PENALTY_NTH_CHILD,
    });
  }

  return candidates;
};

const collectCombinations = (
  stack: SelectorNode[][],
  budget: number = MAX_SELECTOR_COMBINATIONS,
  currentPath: SelectorNode[] = [],
): SelectorNode[][] => {
  if (budget <= 0) return [];
  if (stack.length === 0) return [currentPath];

  const results: SelectorNode[][] = [];
  for (const selectorNode of stack[0]) {
    const remainingBudget = budget - results.length;
    if (remainingBudget <= 0) break;
    results.push(
      ...collectCombinations(stack.slice(1), remainingBudget, [...currentPath, selectorNode]),
    );
  }
  return results;
};

const resolveSelectorRoot = (rootNode: Element | Document, targetElement: Element): ParentNode => {
  const attachedRoot = targetElement.getRootNode();
  if (isShadowRoot(attachedRoot)) {
    return attachedRoot;
  }
  if (isDocumentNode(rootNode)) return rootNode;
  return rootNode.ownerDocument;
};

const isSelectorUnique = (selectorPath: SelectorNode[], selectorRoot: ParentNode): boolean =>
  selectorRoot.querySelectorAll(buildSelectorString(selectorPath)).length === 1;

const buildFallbackPath = (
  targetElement: Element,
  selectorRoot: ParentNode,
): SelectorNode[] | undefined => {
  let currentElement: Element | null = targetElement;
  const path: SelectorNode[] = [];

  while (currentElement && currentElement !== selectorRoot) {
    const currentTagName = currentElement.tagName.toLowerCase();
    const typePosition = getChildIndex(currentElement, currentTagName);
    if (typePosition === undefined) return undefined;

    path.push({
      name: formatNthOfType(currentTagName, typePosition),
      penalty: PENALTY_NTH_OF_TYPE,
    });
    currentElement = currentElement.parentElement;
  }

  return isSelectorUnique(path, selectorRoot) ? path : undefined;
};

export const findUniqueSelector = (
  targetElement: Element,
  root: Element | Document,
  timeoutMs: number,
  attrFilter: (name: string, value: string) => boolean,
): string => {
  if (targetElement.nodeType !== Node.ELEMENT_NODE) {
    throw new NonElementNodeError();
  }
  if (targetElement.tagName.toLowerCase() === "html") {
    return "html";
  }

  const selectorRoot = resolveSelectorRoot(root, targetElement);
  const startTime = Date.now();

  const ancestorStack: SelectorNode[][] = [];
  let currentElement: Element | null = targetElement;
  let depth = 0;
  let foundPath: SelectorNode[] | undefined;

  while (currentElement && currentElement !== selectorRoot && !foundPath) {
    ancestorStack.push(collectCandidateNodes(currentElement, attrFilter));
    currentElement = currentElement.parentElement;
    depth++;

    if (depth >= SEED_MIN_LENGTH) {
      const candidatePaths = collectCombinations(ancestorStack);
      candidatePaths.sort(comparePenalty);

      for (const candidatePath of candidatePaths) {
        if (Date.now() - startTime > timeoutMs) {
          const fallbackPath = buildFallbackPath(targetElement, selectorRoot);
          if (!fallbackPath) {
            throw new SelectorTimeoutError(timeoutMs);
          }
          return buildSelectorString(fallbackPath);
        }
        if (isSelectorUnique(candidatePath, selectorRoot)) {
          foundPath = candidatePath;
          break;
        }
      }
    }
  }

  if (!foundPath && depth < SEED_MIN_LENGTH) {
    const remainingPaths = collectCombinations(ancestorStack);
    remainingPaths.sort(comparePenalty);
    for (const candidatePath of remainingPaths) {
      if (Date.now() - startTime > timeoutMs) break;
      if (isSelectorUnique(candidatePath, selectorRoot)) {
        foundPath = candidatePath;
        break;
      }
    }
  }

  if (!foundPath) {
    throw new SelectorNotFoundError();
  }

  return buildSelectorString(foundPath);
};
