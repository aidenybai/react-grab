import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  DRAG_SELECTION_MAX_TEXT_FLOW_NODES,
  DRAG_SELECTION_MAX_TEXT_RECTS,
} from "../src/constants.js";
import {
  getElementTextBounds,
  invalidateElementTextBoundsCache,
} from "../src/utils/get-element-text-bounds.js";
import { isElementPaintedAtPosition } from "../src/utils/is-element-painted-at-position.js";
import { convertClientPositionToTopWindow } from "../src/utils/convert-client-position-to-top-window.js";

vi.mock("../src/utils/convert-client-position-to-top-window.js", () => ({
  convertClientPositionToTopWindow: vi.fn(() => ({ x: 0, y: 0, scaleX: 1, scaleY: 1 })),
}));

const createTextNode = (textContent: string): Node =>
  Object.assign(Object.create(null), { childNodes: [], nodeType: 3, textContent });

const createElement = (
  tagName: string,
  childNodes: Node[],
  createRange: () => unknown,
  role: string | null = null,
  hasBoxPaint = false,
): Element =>
  Object.assign(Object.create(null), {
    childNodes,
    getAttribute: (attributeName: string) => (attributeName === "role" ? role : null),
    isContentEditable: false,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    nodeType: 1,
    ownerDocument: {
      createRange,
      defaultView: {
        getComputedStyle: () => ({
          backgroundClip: "border-box",
          backgroundColor: hasBoxPaint ? "rgb(240, 240, 240)" : "transparent",
          backgroundImage: "none",
          borderBottomStyle: "none",
          borderBottomWidth: "0px",
          borderLeftStyle: "none",
          borderLeftWidth: "0px",
          borderRightStyle: "none",
          borderRightWidth: "0px",
          borderTopStyle: "none",
          borderTopWidth: "0px",
          boxShadow: "none",
          outlineStyle: "none",
        }),
      },
    },
    tagName,
  });

const createRangeHarness = (rectsByNode: Map<Node, DOMRect[]>) => {
  let selectedNode: Node | null = null;
  const getClientRects = vi.fn(() => (selectedNode ? (rectsByNode.get(selectedNode) ?? []) : []));
  const selectNodeContents = vi.fn((node: Node) => {
    selectedNode = node;
  });
  const createRange = vi.fn(() => ({ getClientRects, selectNodeContents }));
  return { createRange, getClientRects, selectNodeContents };
};

const createRect = (left: number, top: number, width: number, height: number): DOMRect =>
  Object.assign(Object.create(null), { height, left, top, width });

beforeEach(() => {
  vi.stubGlobal("Node", { ELEMENT_NODE: 1, TEXT_NODE: 3 });
  vi.stubGlobal("performance", { now: vi.fn(() => 100) });
  invalidateElementTextBoundsCache();
  vi.mocked(convertClientPositionToTopWindow).mockReturnValue({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("getElementTextBounds", () => {
  it.each(["DIV", "P", "SPAN"])(
    "measures the painted fragment instead of the %s container box",
    (tagName) => {
      const textNode = createTextNode("Syncing workspace…");
      const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(20, 10, 140, 24)]]]));
      const element = createElement(tagName, [textNode], rangeHarness.createRange);

      expect(getElementTextBounds(element)).toEqual([
        { x: 20, y: 10, width: 140, height: 24, borderRadius: "0px" },
      ]);
      expect(rangeHarness.selectNodeContents).toHaveBeenCalledWith(textNode);
      expect(isElementPaintedAtPosition(element, 40, 20)).toBe(true);
      expect(isElementPaintedAtPosition(element, 200, 20)).toBe(false);
    },
  );

  it("keeps a painted text container on its element box", () => {
    const textNode = createTextNode("Painted label");
    const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(10, 10, 40, 20)]]]));
    const element = createElement("DIV", [textNode], rangeHarness.createRange, null, true);

    expect(getElementTextBounds(element)).toBeNull();
    expect(rangeHarness.createRange).not.toHaveBeenCalled();
  });

  it("keeps wrapped fragments separate through inline formatting", () => {
    const firstTextNode = createTextNode("first line");
    const secondTextNode = createTextNode("short line");
    const rangeHarness = createRangeHarness(
      new Map([
        [firstTextNode, [createRect(10, 10, 120, 20)]],
        [secondTextNode, [createRect(10, 30, 60, 20)]],
      ]),
    );
    const inlineElement = createElement("STRONG", [secondTextNode], rangeHarness.createRange);
    const element = createElement("P", [firstTextNode, inlineElement], rangeHarness.createRange);

    expect(getElementTextBounds(element)).toEqual([
      { x: 10, y: 10, width: 120, height: 20, borderRadius: "0px" },
      { x: 10, y: 30, width: 60, height: 20, borderRadius: "0px" },
    ]);
    expect(isElementPaintedAtPosition(element, 100, 20)).toBe(true);
    expect(isElementPaintedAtPosition(element, 100, 40)).toBe(false);
    expect(isElementPaintedAtPosition(element, 50, 40)).toBe(true);
  });

  it("converts iframe fragments to top-window coordinates once per element", () => {
    const textNode = createTextNode("scaled text");
    const rangeHarness = createRangeHarness(
      new Map([[textNode, [createRect(10, 5, 40, 10), createRect(10, 15, 20, 10)]]]),
    );
    const element = createElement("SPAN", [textNode], rangeHarness.createRange);
    vi.mocked(convertClientPositionToTopWindow).mockReturnValue({
      x: 100,
      y: 200,
      scaleX: 2,
      scaleY: 3,
    });

    expect(getElementTextBounds(element)).toEqual([
      { x: 120, y: 215, width: 80, height: 30, borderRadius: "0px" },
      { x: 120, y: 245, width: 40, height: 30, borderRadius: "0px" },
    ]);
    expect(convertClientPositionToTopWindow).toHaveBeenCalledOnce();
  });

  it.each(["A", "BUTTON", "INPUT", "CANVAS", "SVG"])(
    "keeps %s geometry on its element box",
    (tagName) => {
      const textNode = createTextNode("control text");
      const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(10, 10, 40, 20)]]]));
      const element = createElement(tagName, [textNode], rangeHarness.createRange);

      expect(getElementTextBounds(element)).toBeNull();
      expect(rangeHarness.createRange).not.toHaveBeenCalled();
    },
  );

  it("keeps interactive roles on their element box", () => {
    const textNode = createTextNode("custom control");
    const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(10, 10, 40, 20)]]]));
    const element = createElement("DIV", [textNode], rangeHarness.createRange, "button");

    expect(getElementTextBounds(element)).toBeNull();
    expect(rangeHarness.createRange).not.toHaveBeenCalled();
  });

  it("falls back to the element box when the container has block content", () => {
    const textNode = createTextNode("card content");
    const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(10, 10, 40, 20)]]]));
    const blockElement = createElement("P", [textNode], rangeHarness.createRange);
    const element = createElement("DIV", [blockElement], rangeHarness.createRange);

    expect(getElementTextBounds(element)).toBeNull();
    expect(rangeHarness.createRange).not.toHaveBeenCalled();
  });

  it("bounds text-flow traversal work", () => {
    const childNodes = Array.from({ length: DRAG_SELECTION_MAX_TEXT_FLOW_NODES + 1 }, () =>
      createTextNode(" "),
    );
    const rangeHarness = createRangeHarness(new Map());
    const element = createElement("DIV", childNodes, rangeHarness.createRange);

    expect(getElementTextBounds(element)).toBeNull();
    expect(rangeHarness.createRange).not.toHaveBeenCalled();
  });

  it("bounds queued descendants before traversing nested inline content", () => {
    const nestedTextNodes = Array.from({ length: DRAG_SELECTION_MAX_TEXT_FLOW_NODES }, () =>
      createTextNode(" "),
    );
    const rangeHarness = createRangeHarness(new Map());
    const inlineElement = createElement("SPAN", nestedTextNodes, rangeHarness.createRange);
    const element = createElement("P", [inlineElement], rangeHarness.createRange);

    expect(getElementTextBounds(element)).toBeNull();
    expect(rangeHarness.createRange).not.toHaveBeenCalled();
  });

  it("falls back instead of partially measuring too many wrapped fragments", () => {
    const textNode = createTextNode("many wrapped lines");
    const rects = Array.from({ length: DRAG_SELECTION_MAX_TEXT_RECTS + 1 }, (_, rectIndex) =>
      createRect(0, rectIndex * 10, 40, 10),
    );
    const rangeHarness = createRangeHarness(new Map([[textNode, rects]]));
    const element = createElement("P", [textNode], rangeHarness.createRange);

    expect(getElementTextBounds(element)).toBeNull();
  });

  it("falls back when range measurement fails", () => {
    const textNode = createTextNode("unmeasurable text");
    const createRange = vi.fn(() => {
      throw new Error("range unavailable");
    });
    const element = createElement("P", [textNode], createRange);

    expect(getElementTextBounds(element)).toBeNull();
  });

  it("reuses text geometry within the bounds cache window", () => {
    const textNode = createTextNode("cached text");
    const rangeHarness = createRangeHarness(new Map([[textNode, [createRect(10, 10, 40, 20)]]]));
    const element = createElement("P", [textNode], rangeHarness.createRange);

    const firstBounds = getElementTextBounds(element);
    const secondBounds = getElementTextBounds(element);

    expect(secondBounds).toBe(firstBounds);
    expect(rangeHarness.createRange).toHaveBeenCalledOnce();
  });
});
