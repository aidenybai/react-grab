import { transferTextNodeBoundsRectIndex } from "../utils/create-text-node-bounds.js";
import { isTextNode } from "../utils/is-text-node.js";

interface TextNodeAnchor {
  childIndex: number;
  directTextIndex: number;
  textContent: string;
}

const anchorByTextNode = new WeakMap<Text, TextNodeAnchor>();

const getDirectTextNodes = (element: Element): Text[] => {
  const textNodes: Text[] = [];
  for (const childNode of element.childNodes) {
    if (isTextNode(childNode)) textNodes.push(childNode);
  }
  return textNodes;
};

export const trackTextNodeAnchor = (textNode: Text): void => {
  const parentElement = textNode.parentElement;
  if (!textNode.isConnected || !parentElement) return;

  const directTextNodes = getDirectTextNodes(parentElement);
  anchorByTextNode.set(textNode, {
    childIndex: Array.from(parentElement.childNodes).indexOf(textNode),
    directTextIndex: directTextNodes.indexOf(textNode),
    textContent: textNode.textContent ?? "",
  });
};

export const resolveLiveTextNode = (
  textNode: Text | null | undefined,
  liveElement: Element | null | undefined,
): Text | null => {
  if (!textNode || !liveElement) return null;
  if (textNode.isConnected && textNode.parentElement === liveElement) {
    trackTextNodeAnchor(textNode);
    return textNode;
  }

  const anchor = anchorByTextNode.get(textNode);
  if (!anchor) return null;

  const childCandidate = liveElement.childNodes[anchor.childIndex];
  const directTextNodes = getDirectTextNodes(liveElement);
  const indexedTextCandidate = directTextNodes[anchor.directTextIndex];
  const contentCandidate = directTextNodes.find(
    (candidate) => candidate.textContent === anchor.textContent,
  );
  const liveTextNode =
    isTextNode(childCandidate) && childCandidate.textContent === anchor.textContent
      ? childCandidate
      : (contentCandidate ?? indexedTextCandidate);
  if (!liveTextNode) return null;

  transferTextNodeBoundsRectIndex(textNode, liveTextNode);
  trackTextNodeAnchor(liveTextNode);
  return liveTextNode;
};
