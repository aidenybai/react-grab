import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { resolveLiveTextNode, trackTextNodeAnchor } from "../src/core/text-node-anchors.js";
import { transferTextNodeBoundsRectIndex } from "../src/utils/create-text-node-bounds.js";
import { isTextNode } from "../src/utils/is-text-node.js";

vi.mock("../src/utils/create-text-node-bounds.js", () => ({
  transferTextNodeBoundsRectIndex: vi.fn(),
}));

vi.mock("../src/utils/is-text-node.js", () => ({
  isTextNode: vi.fn(),
}));

const textNodes = new Set<Node>();

const createElement = (childNodes: Node[]): Element => {
  const element: Element = Object.create(null);
  Object.defineProperty(element, "childNodes", { value: childNodes });
  return element;
};

const createTextNode = (textContent: string, parentElement: Element): Text => {
  const textNode: Text = Object.create(null);
  Object.defineProperties(textNode, {
    isConnected: { configurable: true, value: true },
    parentElement: { configurable: true, value: parentElement },
    textContent: { value: textContent },
  });
  textNodes.add(textNode);
  return textNode;
};

beforeEach(() => {
  vi.resetAllMocks();
  textNodes.clear();
  vi.mocked(isTextNode).mockImplementation((node) => textNodes.has(node));
});

describe("text node anchors", () => {
  it("prefers matching text content over a stale child index", () => {
    const previousChildren: Node[] = [];
    const previousElement = createElement(previousChildren);
    const previousTextNode = createTextNode("tracked text", previousElement);
    previousChildren.push(previousTextNode);
    trackTextNodeAnchor(previousTextNode);
    Object.defineProperty(previousTextNode, "isConnected", { value: false });

    const liveChildren: Node[] = [];
    const liveElement = createElement(liveChildren);
    const wrongTextNode = createTextNode("new sibling", liveElement);
    const matchingTextNode = createTextNode("tracked text", liveElement);
    liveChildren.push(wrongTextNode, matchingTextNode);

    expect(resolveLiveTextNode(previousTextNode, liveElement)).toBe(matchingTextNode);
    expect(transferTextNodeBoundsRectIndex).toHaveBeenCalledWith(
      previousTextNode,
      matchingTextNode,
    );
  });

  it("ignores whitespace-only siblings when text content changes", () => {
    const previousChildren: Node[] = [];
    const previousElement = createElement(previousChildren);
    const previousTextNode = createTextNode("previous text", previousElement);
    previousChildren.push(previousTextNode);
    trackTextNodeAnchor(previousTextNode);
    Object.defineProperty(previousTextNode, "isConnected", { value: false });

    const liveChildren: Node[] = [];
    const liveElement = createElement(liveChildren);
    const whitespaceTextNode = createTextNode(" \n ", liveElement);
    const changedTextNode = createTextNode("changed text", liveElement);
    liveChildren.push(whitespaceTextNode, changedTextNode);

    expect(resolveLiveTextNode(previousTextNode, liveElement)).toBe(changedTextNode);
  });

  it("does not relink to a sibling that shifts into a removed text node's index", () => {
    const previousChildren: Node[] = [];
    const previousElement = createElement(previousChildren);
    const removedTextNode = createTextNode("removed text", previousElement);
    const nestedElement = createElement([]);
    const remainingTextNode = createTextNode("remaining text", previousElement);
    previousChildren.push(removedTextNode, nestedElement, remainingTextNode);
    trackTextNodeAnchor(removedTextNode);
    Object.defineProperty(removedTextNode, "isConnected", { value: false });

    const liveChildren: Node[] = [];
    const liveElement = createElement(liveChildren);
    const liveNestedElement = createElement([]);
    const liveRemainingTextNode = createTextNode("remaining text", liveElement);
    liveChildren.push(liveNestedElement, liveRemainingTextNode);

    expect(resolveLiveTextNode(removedTextNode, liveElement)).toBe(null);
    expect(transferTextNodeBoundsRectIndex).not.toHaveBeenCalled();
  });

  it("preserves the selected occurrence when direct text content is duplicated", () => {
    const previousChildren: Node[] = [];
    const previousElement = createElement(previousChildren);
    const firstPreviousTextNode = createTextNode("duplicate", previousElement);
    const selectedPreviousTextNode = createTextNode("duplicate", previousElement);
    previousChildren.push(firstPreviousTextNode, selectedPreviousTextNode);
    trackTextNodeAnchor(selectedPreviousTextNode);
    Object.defineProperty(selectedPreviousTextNode, "isConnected", { value: false });

    const liveChildren: Node[] = [];
    const liveElement = createElement(liveChildren);
    const insertedElement = createElement([]);
    const firstLiveTextNode = createTextNode("duplicate", liveElement);
    const selectedLiveTextNode = createTextNode("duplicate", liveElement);
    liveChildren.push(insertedElement, firstLiveTextNode, selectedLiveTextNode);

    expect(resolveLiveTextNode(selectedPreviousTextNode, liveElement)).toBe(selectedLiveTextNode);
  });
});
