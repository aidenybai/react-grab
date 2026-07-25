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
});
