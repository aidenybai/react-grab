import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { convertTopWindowPositionToClient } from "../src/utils/convert-top-window-position-to-client.js";
import { getLocalContentElementAtPoint } from "../src/utils/get-local-content-element-at-point.js";
import { isShadowRoot } from "../src/utils/is-shadow-root.js";

vi.mock("../src/utils/convert-top-window-position-to-client.js", () => ({
  convertTopWindowPositionToClient: vi.fn((_ownerWindow, clientX, clientY) => ({
    x: clientX,
    y: clientY,
  })),
}));

vi.mock("../src/utils/is-shadow-root.js", () => ({
  isShadowRoot: vi.fn(() => false),
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
  vi.mocked(isShadowRoot).mockReturnValue(false);
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

  it("accepts a caret API element node directly", () => {
    const { contentElement, hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    Object.assign(contentElement, { nodeType: Node.ELEMENT_NODE });
    vi.mocked(targetDocument.caretPositionFromPoint).mockReturnValue(
      Object.assign(Object.create(null), { offsetNode: contentElement }),
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
  });

  it("returns no refinement when the owner document has no window", () => {
    const { hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    Object.assign(targetDocument, { defaultView: null });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
    expect(convertTopWindowPositionToClient).not.toHaveBeenCalled();
    expect(targetDocument.caretPositionFromPoint).not.toHaveBeenCalled();
  });

  it("returns no refinement when neither caret API is available", () => {
    const { hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    Object.assign(targetDocument, {
      caretPositionFromPoint: undefined,
      caretRangeFromPoint: undefined,
    });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
  });

  it("falls through to a caret range when a caret position misses", () => {
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
    vi.mocked(targetDocument.caretPositionFromPoint).mockReturnValue(null);
    vi.mocked(targetDocument.caretRangeFromPoint).mockReturnValue(
      Object.assign(Object.create(null), { startContainer: caretNode }),
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
  });

  it("does not refine when the caret resolves to the native hit itself", () => {
    const { hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    Object.assign(hitElement, { nodeType: Node.ELEMENT_NODE });
    vi.mocked(targetDocument.caretPositionFromPoint).mockReturnValue(
      Object.assign(Object.create(null), { offsetNode: hitElement }),
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
  });

  it("does not refine an orphaned caret text node", () => {
    const { hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    const orphanedTextNode: Node = Object.assign(Object.create(null), {
      nodeType: 3,
      parentElement: null,
    });
    vi.mocked(targetDocument.caretPositionFromPoint).mockReturnValue(
      Object.assign(Object.create(null), { offsetNode: orphanedTextNode }),
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

  it("does not leave a nested SVG root when the native hit is its descendant", () => {
    const { hitElement } = createContentHit(
      "rect",
      "http://www.w3.org/2000/svg",
      "text",
      "http://www.w3.org/2000/svg",
    );
    const nestedSvgElement: Element = Object.assign(Object.create(null), {
      contains: vi.fn(() => false),
      localName: "svg",
      namespaceURI: "http://www.w3.org/2000/svg",
      parentElement: null,
    });
    const outerSvgElement: Element = Object.assign(Object.create(null), {
      contains: vi.fn(() => true),
      localName: "svg",
      namespaceURI: "http://www.w3.org/2000/svg",
      parentElement: null,
    });
    Object.assign(nestedSvgElement, { parentElement: outerSvgElement });
    Object.assign(hitElement, { parentElement: nestedSvgElement });

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBeNull();
    expect(nestedSvgElement.contains).toHaveBeenCalledOnce();
    expect(outerSvgElement.contains).not.toHaveBeenCalled();
  });

  it("does not compute pointer events for SVG content", () => {
    const { contentElement, hitElement } = createContentHit(
      "svg",
      "http://www.w3.org/2000/svg",
      "text",
      "http://www.w3.org/2000/svg",
    );

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
    expect(topWindow.getComputedStyle).not.toHaveBeenCalled();
  });

  it("passes the local shadow root to the standard caret API", () => {
    const { contentElement, hitElement, targetDocument } = createContentHit(
      "button",
      "http://www.w3.org/1999/xhtml",
      "span",
      "http://www.w3.org/1999/xhtml",
    );
    const shadowRoot: ShadowRoot = Object.assign(Object.create(null), {});
    Object.assign(hitElement, { getRootNode: () => shadowRoot });
    vi.mocked(isShadowRoot).mockImplementation((rootNode) => rootNode === shadowRoot);

    expect(getLocalContentElementAtPoint(hitElement, 15, 20)).toBe(contentElement);
    expect(targetDocument.caretPositionFromPoint).toHaveBeenCalledWith(15, 20, {
      shadowRoots: [shadowRoot],
    });
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
