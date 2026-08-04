import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ElementBounds } from "../src/types.js";
import { getElementsInDrag } from "../src/utils/get-elements-in-drag.js";
import { createElementBounds } from "../src/utils/create-element-bounds.js";
import { getDeepElementsAtPoint } from "../src/utils/get-deep-elements-at-point.js";

vi.mock("../src/utils/compare-element-document-order.js", () => ({
  compareElementDocumentOrder: vi.fn(() => 0),
}));

vi.mock("../src/utils/create-element-bounds.js", () => ({
  createElementBounds: vi.fn(),
}));

vi.mock("../src/utils/get-accessible-iframe-document.js", () => ({
  getAccessibleIframeDocument: vi.fn(() => null),
}));

vi.mock("../src/utils/get-composed-parent-element.js", () => ({
  getComposedParentElement: vi.fn(() => null),
}));

vi.mock("../src/utils/get-deep-elements-at-point.js", () => ({
  getDeepElementsAtPoint: vi.fn(),
}));

vi.mock("../src/utils/is-iframe-element.js", () => ({
  isIframeElement: vi.fn(() => false),
}));

vi.mock("../src/utils/is-root-element.js", () => ({
  isRootElement: vi.fn(() => false),
}));

vi.mock("../src/utils/is-shadow-root.js", () => ({
  isShadowRoot: vi.fn(() => false),
}));

vi.mock("../src/utils/pointer-events-freeze.js", () => ({
  resumePointerEventsFreeze: vi.fn(),
  suspendPointerEventsFreeze: vi.fn(),
}));

vi.mock("../src/utils/runtime-mode.js", () => ({
  isWithinScope: vi.fn(() => true),
}));

const createElement = (): Element => Object.create(null);

const setElementBounds = (boundsByElement: Map<Element, ElementBounds>) => {
  vi.mocked(createElementBounds).mockImplementation((element) => {
    const bounds = boundsByElement.get(element);
    if (!bounds) throw new Error("Missing element bounds");
    return bounds;
  });
};

beforeEach(() => {
  vi.stubGlobal("window", { innerHeight: 300, innerWidth: 300 });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("getElementsInDrag", () => {
  it("selects the nearest candidate even when another candidate has more coverage", () => {
    const nearestElement = createElement();
    const higherCoverageElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([nearestElement, higherCoverageElement]);
    setElementBounds(
      new Map([
        [nearestElement, { x: 60, y: 60, width: 180, height: 180, borderRadius: "0px" }],
        [higherCoverageElement, { x: 170, y: 100, width: 80, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([nearestElement]);
  });

  it("prefers the candidate under the drag endpoint over one with a closer center", () => {
    const endpointElement = createElement();
    const centeredElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([centeredElement, endpointElement]);
    setElementBounds(
      new Map([
        [endpointElement, { x: 100, y: 80, width: 150, height: 140, borderRadius: "0px" }],
        [centeredElement, { x: 140, y: 0, width: 20, height: 300, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 195, y: 150 },
      () => true,
    );

    expect(elements).toEqual([endpointElement]);
    expect(getDeepElementsAtPoint).toHaveBeenNthCalledWith(1, 195, 150);
  });

  it("uses drag direction to resolve otherwise equal fallback candidates", () => {
    const leftElement = createElement();
    const rightElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([leftElement, rightElement]);
    setElementBounds(
      new Map([
        [leftElement, { x: 50, y: 80, width: 120, height: 140, borderRadius: "0px" }],
        [rightElement, { x: 130, y: 80, width: 120, height: 140, borderRadius: "0px" }],
      ]),
    );

    const leftToRightElements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 195, y: 150 },
      () => true,
    );
    const rightToLeftElements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 105, y: 150 },
      () => true,
    );

    expect(leftToRightElements).toEqual([rightElement]);
    expect(rightToLeftElements).toEqual([leftElement]);
  });

  it("ignores viewport-covering candidates", () => {
    const viewportElement = createElement();
    const nearbyElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([viewportElement, nearbyElement]);
    setElementBounds(
      new Map([
        [viewportElement, { x: 0, y: 0, width: 300, height: 300, borderRadius: "0px" }],
        [nearbyElement, { x: 75, y: 75, width: 200, height: 200, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([nearbyElement]);
  });

  it("ignores viewport-covering candidates that meet the coverage threshold", () => {
    const viewportElement = createElement();
    const enclosedElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([viewportElement, enclosedElement]);
    setElementBounds(
      new Map([
        [viewportElement, { x: 0, y: 0, width: 300, height: 300, borderRadius: "0px" }],
        [enclosedElement, { x: 120, y: 120, width: 40, height: 40, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 10, y: 10, width: 280, height: 280 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([enclosedElement]);
  });

  it("keeps viewport-sized candidates that are mostly offscreen", () => {
    const offscreenElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([offscreenElement]);
    setElementBounds(
      new Map([
        [offscreenElement, { x: -200, y: -200, width: 300, height: 300, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 50, y: 50, width: 50, height: 50 },
      { x: 75, y: 75 },
      () => true,
    );

    expect(elements).toEqual([offscreenElement]);
  });

  it("prefers covered candidates over a nearer fallback", () => {
    const nearerFallbackElement = createElement();
    const coveredElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([nearerFallbackElement, coveredElement]);
    setElementBounds(
      new Map([
        [nearerFallbackElement, { x: 60, y: 60, width: 180, height: 180, borderRadius: "0px" }],
        [coveredElement, { x: 190, y: 145, width: 10, height: 10, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([coveredElement]);
  });

  it("prefers the topmost candidate when multiple candidates contain the drag endpoint", () => {
    const wrapperElement = createElement();
    const nestedElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([nestedElement, wrapperElement]);
    setElementBounds(
      new Map([
        [wrapperElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
        [nestedElement, { x: 90, y: 90, width: 120, height: 120, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([nestedElement]);
  });

  it("does not treat every candidate as viewport-covering while the viewport is zero-sized", () => {
    const candidateElement = createElement();
    vi.stubGlobal("window", { innerHeight: 0, innerWidth: 0 });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([candidateElement]);
    setElementBounds(
      new Map([
        [candidateElement, { x: 100, y: 100, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 125, y: 125, width: 50, height: 50 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([candidateElement]);
  });

  it("skips candidates with non-finite geometry", () => {
    const invalidElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([invalidElement]);
    setElementBounds(
      new Map([
        [invalidElement, { x: Number.NaN, y: 100, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(elements).toEqual([]);
  });
});
