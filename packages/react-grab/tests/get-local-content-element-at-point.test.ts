import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { convertTopWindowPositionToClient } from "../src/utils/convert-top-window-position-to-client.js";
import { getLocalContentElementAtPoint } from "../src/utils/get-local-content-element-at-point.js";

vi.mock("../src/utils/convert-top-window-position-to-client.js", () => ({
  convertTopWindowPositionToClient: vi.fn((_ownerWindow, clientX, clientY) => ({
    x: clientX,
    y: clientY,
  })),
}));

const topWindow: Window = Object.assign(Object.create(null), {
  getComputedStyle: vi.fn(() => ({ pointerEvents: "none" })),
});

const createContentHit = (
  hitLocalName: string,
  hitNamespace: string,
  contentLocalName: string,
  contentNamespace: string,
): {
  contentElement: Element;
  hitElement: Element;
  targetDocument: Document;
} => {
  const contentElement: Element = Object.assign(Object.create(null), {
    localName: contentLocalName,
    namespaceURI: contentNamespace,
  });
  const caretNode: Node = Object.assign(Object.create(null), {
    nodeType: 3,
    parentElement: contentElement,
  });
  const targetDocument: Document = Object.assign(Object.create(null), {
    defaultView: topWindow,
    caretPositionFromPoint: vi.fn(() =>
      Object.assign(Object.create(null), { offsetNode: caretNode }),
    ),
    caretRangeFromPoint: vi.fn(() => null),
  });
  Object.assign(contentElement, { ownerDocument: targetDocument });
  const hitElement: Element = Object.assign(Object.create(null), {
    contains: vi.fn((element) => element === contentElement),
    getRootNode: vi.fn(() => targetDocument),
    localName: hitLocalName,
    namespaceURI: hitNamespace,
    ownerDocument: targetDocument,
    parentElement: null,
    tagName: hitLocalName.toUpperCase(),
  });
  return { contentElement, hitElement, targetDocument };
};

beforeEach(() => {
  vi.stubGlobal("Node", { ELEMENT_NODE: 1 });
  vi.stubGlobal("window", topWindow);
  vi.clearAllMocks();
  vi.mocked(topWindow.getComputedStyle).mockReturnValue(
    Object.assign(Object.create(null), { pointerEvents: "none" }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLocalContentElementAtPoint", () => {
  it("refines a native container hit to its text-bearing descendant", () => {
    const { contentElement, hitElement } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
    expect(convertTopWindowPositionToClient).toHaveBeenCalledWith(topWindow, 15, 20);
  });

  it("does not replace an HTML hit with interactive nested text", () => {
    const { hitElement } = createContentHit(
      "li",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    vi.mocked(topWindow.getComputedStyle).mockReturnValue(
      Object.assign(Object.create(null), { pointerEvents: "auto" }),
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
  });

  it("allows SVG text elsewhere in the same SVG render island", () => {
    const { contentElement, hitElement } = createContentHit(
      "rect",
      "http://www.w3.org/2000/svg",
      "text",
      "http://www.w3.org/2000/svg",
    );
    const svgElement: Element = Object.assign(Object.create(null), {
      contains: vi.fn((element) => element === contentElement),
      localName: "svg",
      namespaceURI: "http://www.w3.org/2000/svg",
      parentElement: null,
    });
    Object.assign(hitElement, { parentElement: svgElement });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
  });

  it("does not leave a nested SVG root", () => {
    const { contentElement, hitElement } = createContentHit(
      "svg",
      "http://www.w3.org/2000/svg",
      "text",
      "http://www.w3.org/2000/svg",
    );
    const outerSvgElement: Element = Object.assign(Object.create(null), {
      contains: vi.fn(() => false),
      localName: "svg",
      namespaceURI: "http://www.w3.org/2000/svg",
      parentElement: null,
    });
    Object.assign(hitElement, { parentElement: outerSvgElement });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
    expect(outerSvgElement.contains).not.toHaveBeenCalled();
  });

  it("does not refine to unrelated content outside the local hit", () => {
    const { hitElement } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    vi.mocked(hitElement.contains).mockReturnValue(false);

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
  });

  it("does not use document roots as unbounded refinement islands", () => {
    const { hitElement, targetDocument } = createContentHit(
      "body",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
    expect(targetDocument.caretPositionFromPoint).not.toHaveBeenCalled();
  });

  it("falls back to WebKit caret ranges", () => {
    const { contentElement, hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    const caretNode: Node = Object.assign(Object.create(null), {
      nodeType: 3,
      parentElement: contentElement,
    });
    Object.assign(targetDocument, {
      caretPositionFromPoint: undefined,
      caretRangeFromPoint: vi.fn(() =>
        Object.assign(Object.create(null), { startContainer: caretNode }),
      ),
    });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
  });
});
