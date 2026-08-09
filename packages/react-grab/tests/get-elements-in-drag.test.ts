import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ElementBounds } from "../src/types.js";
import { getElementsInDrag } from "../src/utils/get-elements-in-drag.js";
import { compareElementDocumentOrder } from "../src/utils/compare-element-document-order.js";
import { createElementBounds } from "../src/utils/create-element-bounds.js";
import { getElementTextBounds } from "../src/utils/get-element-text-bounds.js";
import { getAccessibleIframeDocument } from "../src/utils/get-accessible-iframe-document.js";
import { getComposedParentElement } from "../src/utils/get-composed-parent-element.js";
import { getDeepElementsAtPoint } from "../src/utils/get-deep-elements-at-point.js";
import { getLocalContentElementAtPoint } from "../src/utils/get-local-content-element-at-point.js";
import { isIframeElement } from "../src/utils/is-iframe-element.js";
import { isRootElement } from "../src/utils/is-root-element.js";
import { isShadowRoot } from "../src/utils/is-shadow-root.js";
import {
  getThreeSelectionElements,
  resolveThreeElementAtPoint,
} from "../src/core/three-selection.js";
import {
  resumePointerEventsFreeze,
  suspendPointerEventsFreeze,
} from "../src/utils/pointer-events-freeze.js";
import { isWithinScope } from "../src/utils/runtime-mode.js";
import {
  DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS,
  DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS,
  DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS,
} from "../src/constants.js";

vi.mock("../src/utils/compare-element-document-order.js", () => ({
  compareElementDocumentOrder: vi.fn(() => 0),
}));

vi.mock("../src/core/three-selection.js", () => ({
  getThreeSelectionElements: vi.fn(() => []),
  resolveThreeElementAtPoint: vi.fn((element) => element),
}));

vi.mock("../src/utils/create-element-bounds.js", () => ({
  createElementBounds: vi.fn(),
}));

vi.mock("../src/utils/get-element-text-bounds.js", () => ({
  getElementTextBounds: vi.fn(() => null),
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

vi.mock("../src/utils/get-local-content-element-at-point.js", () => ({
  getLocalContentElementAtPoint: vi.fn(() => null),
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

const createElement = (children: Element[] = []): Element => {
  const element = Object.assign(Object.create(null), {
    children,
    getRootNode: () => null,
    nextElementSibling: null,
    parentElement: null,
    previousElementSibling: null,
    shadowRoot: null,
    tagName: "DIV",
  });
  for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
    Object.assign(children[childIndex], {
      nextElementSibling: children[childIndex + 1] ?? null,
      parentElement: element,
      previousElementSibling: children[childIndex - 1] ?? null,
    });
  }
  return element;
};

const setElementBounds = (boundsByElement: Map<Element, ElementBounds>) => {
  vi.mocked(createElementBounds).mockImplementation((element) => {
    const bounds = boundsByElement.get(element);
    if (!bounds) throw new Error("Missing element bounds");
    return bounds;
  });
};

beforeEach(() => {
  vi.stubGlobal("window", { innerHeight: 300, innerWidth: 300 });
  vi.mocked(compareElementDocumentOrder).mockReturnValue(0);
  vi.mocked(createElementBounds).mockReset();
  vi.mocked(getAccessibleIframeDocument).mockReturnValue(null);
  vi.mocked(getElementTextBounds).mockReturnValue(null);
  vi.mocked(getComposedParentElement).mockReturnValue(null);
  vi.mocked(getDeepElementsAtPoint).mockReturnValue([]);
  vi.mocked(getLocalContentElementAtPoint).mockReturnValue(null);
  vi.mocked(getThreeSelectionElements).mockReturnValue([]);
  vi.mocked(resolveThreeElementAtPoint).mockImplementation((element) => element);
  vi.mocked(isIframeElement).mockReturnValue(false);
  vi.mocked(isRootElement).mockReturnValue(false);
  vi.mocked(isShadowRoot).mockReturnValue(false);
  vi.mocked(isWithinScope).mockReturnValue(true);
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

  it("includes local pointer-none content at the drag endpoint", () => {
    const svgElement = createElement();
    const textElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([svgElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(textElement);
    setElementBounds(
      new Map([
        [svgElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
        [textElement, { x: 125, y: 125, width: 50, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 125, y: 125, width: 50, height: 20 },
      { x: 150, y: 135 },
      () => true,
    );

    expect(elements).toEqual([textElement]);
    expect(getLocalContentElementAtPoint).toHaveBeenCalledOnce();
  });

  it("only refines local content at the drag endpoint", () => {
    const candidateElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([candidateElement]);
    setElementBounds(
      new Map([
        [candidateElement, { x: 100, y: 100, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    getElementsInDrag({ x: 100, y: 100, width: 100, height: 100 }, { x: 195, y: 195 }, () => true);

    expect(vi.mocked(getDeepElementsAtPoint).mock.calls.length).toBeGreaterThan(1);
    expect(getLocalContentElementAtPoint).toHaveBeenCalledOnce();
    expect(getLocalContentElementAtPoint).toHaveBeenCalledWith(candidateElement, 195, 195);
  });

  it("selects projected Three.js objects instead of their shared canvas", () => {
    const canvasElement = createElement();
    const leftMeshElement = createElement();
    const rightMeshElement = createElement();
    const canvasContainerElement = createElement([canvasElement]);
    Object.assign(canvasElement, { tagName: "CANVAS" });
    Object.assign(leftMeshElement, { tagName: "MESH" });
    Object.assign(rightMeshElement, { tagName: "MESH" });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([canvasElement, canvasContainerElement]);
    vi.mocked(getThreeSelectionElements).mockReturnValue([leftMeshElement, rightMeshElement]);
    setElementBounds(
      new Map([
        [canvasElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
        [canvasContainerElement, { x: 0, y: 0, width: 300, height: 300, borderRadius: "0px" }],
        [leftMeshElement, { x: 80, y: 100, width: 40, height: 40, borderRadius: "0px" }],
        [rightMeshElement, { x: 180, y: 100, width: 40, height: 40, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 50, y: 50, width: 200, height: 200 },
      { x: 245, y: 245 },
      () => true,
    );

    expect(elements).toEqual([leftMeshElement, rightMeshElement]);
    expect(getThreeSelectionElements).toHaveBeenCalledOnce();
    expect(getThreeSelectionElements).toHaveBeenCalledWith(canvasElement, canvasElement);
  });

  it("passes the endpoint instance into Three.js drag enumeration", () => {
    const canvasElement = createElement();
    const instanceElement = createElement();
    Object.assign(canvasElement, { tagName: "CANVAS" });
    Object.assign(instanceElement, { tagName: "INSTANCEDMESH" });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([canvasElement]);
    vi.mocked(resolveThreeElementAtPoint).mockReturnValue(instanceElement);
    vi.mocked(getThreeSelectionElements).mockReturnValue([instanceElement]);
    setElementBounds(
      new Map([
        [canvasElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
        [instanceElement, { x: 180, y: 180, width: 30, height: 30, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 175, y: 175, width: 40, height: 40 },
      { x: 200, y: 200 },
      () => true,
    );

    expect(elements).toEqual([instanceElement]);
    expect(resolveThreeElementAtPoint).toHaveBeenCalledOnce();
    expect(resolveThreeElementAtPoint).toHaveBeenCalledWith(canvasElement, 200, 200);
    expect(getThreeSelectionElements).toHaveBeenCalledWith(canvasElement, instanceElement);
  });

  it("keeps the canvas when Three.js endpoint resolution fails", () => {
    const canvasElement = createElement();
    Object.assign(canvasElement, { tagName: "CANVAS" });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([canvasElement]);
    vi.mocked(resolveThreeElementAtPoint).mockImplementation(() => {
      throw new Error("renderer state is unreadable");
    });
    setElementBounds(
      new Map([[canvasElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 50, y: 50, width: 200, height: 200 },
      { x: 245, y: 245 },
      () => true,
    );

    expect(elements).toEqual([canvasElement]);
  });

  it("keeps an ordinary canvas when it has no Three.js targets", () => {
    const canvasElement = createElement();
    Object.assign(canvasElement, { tagName: "CANVAS" });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([canvasElement]);
    setElementBounds(
      new Map([[canvasElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 50, y: 50, width: 200, height: 200 },
      { x: 245, y: 245 },
      () => true,
    );

    expect(elements).toEqual([canvasElement]);
  });

  it("looks through invalid stack layers for local content at the endpoint", () => {
    const ignoredOverlayElement = createElement();
    const contentContainerElement = createElement();
    const localContentElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([
      ignoredOverlayElement,
      contentContainerElement,
    ]);
    vi.mocked(getLocalContentElementAtPoint).mockImplementation((element) =>
      element === contentContainerElement ? localContentElement : null,
    );
    setElementBounds(
      new Map([
        [ignoredOverlayElement, { x: 0, y: 0, width: 300, height: 300, borderRadius: "0px" }],
        [contentContainerElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
        [localContentElement, { x: 140, y: 140, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 140, y: 140, width: 20, height: 20 },
      { x: 150, y: 150 },
      (element) => element !== ignoredOverlayElement,
    );

    expect(elements).toEqual([localContentElement]);
    expect(getLocalContentElementAtPoint).toHaveBeenNthCalledWith(
      1,
      ignoredOverlayElement,
      150,
      150,
    );
    expect(getLocalContentElementAtPoint).toHaveBeenNthCalledWith(
      2,
      contentContainerElement,
      150,
      150,
    );
  });

  it("stops local refinement at the first valid paint layer", () => {
    const topElement = createElement();
    const lowerElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([topElement, lowerElement]);
    setElementBounds(
      new Map([
        [topElement, { x: 100, y: 100, width: 100, height: 100, borderRadius: "0px" }],
        [lowerElement, { x: 100, y: 100, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    getElementsInDrag({ x: 125, y: 125, width: 50, height: 50 }, { x: 150, y: 150 }, () => true);

    expect(getLocalContentElementAtPoint).toHaveBeenCalledOnce();
    expect(getLocalContentElementAtPoint).toHaveBeenCalledWith(topElement, 150, 150);
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

  it("prefers the smaller candidate when overlapping candidates contain the endpoint", () => {
    const containerElement = createElement();
    const targetElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement, targetElement]);
    setElementBounds(
      new Map([
        [containerElement, { x: 0, y: 0, width: 200, height: 200, borderRadius: "0px" }],
        [targetElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 25, y: 25 },
      () => true,
    );

    expect(elements).toEqual([targetElement]);
  });

  it("fills unsampled table rows around a sampled cell", () => {
    const firstCell = createElement();
    const secondCell = createElement();
    const thirdCell = createElement();
    const firstRow = createElement([firstCell]);
    const secondRow = createElement([secondCell]);
    const thirdRow = createElement([thirdCell]);
    const tableBody = createElement([firstRow, secondRow, thirdRow]);
    Object.assign(firstRow, { tagName: "TR" });
    Object.assign(secondRow, { tagName: "TR" });
    Object.assign(thirdRow, { tagName: "TR" });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([firstCell, tableBody]);
    vi.mocked(getComposedParentElement).mockImplementation((element) => {
      if (element === firstCell) return firstRow;
      if (element === secondCell) return secondRow;
      if (element === thirdCell) return thirdRow;
      if (element === firstRow || element === secondRow || element === thirdRow) return tableBody;
      return null;
    });
    setElementBounds(
      new Map([
        [tableBody, { x: 0, y: 0, width: 300, height: 500, borderRadius: "0px" }],
        [firstRow, { x: 0, y: 0, width: 300, height: 100, borderRadius: "0px" }],
        [secondRow, { x: 0, y: 100, width: 300, height: 100, borderRadius: "0px" }],
        [thirdRow, { x: 0, y: 200, width: 300, height: 100, borderRadius: "0px" }],
        [firstCell, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }],
        [secondCell, { x: 0, y: 100, width: 100, height: 100, borderRadius: "0px" }],
        [thirdCell, { x: 0, y: 200, width: 100, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 300, height: 300 },
      { x: 299, y: 299 },
      () => true,
    );

    expect(elements).toEqual([firstRow, secondRow, thirdRow]);
  });

  it("bounds candidate neighborhood inspections on dense containers", () => {
    const siblingElements = Array.from(
      { length: DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS + 10 },
      () => createElement(),
    );
    for (const siblingElement of siblingElements) {
      Object.assign(siblingElement, { tagName: "TR" });
    }
    createElement(siblingElements);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([siblingElements[0]]);
    const boundsByElement = new Map<Element, ElementBounds>();
    for (const siblingElement of siblingElements) {
      boundsByElement.set(siblingElement, {
        x: 10,
        y: 10,
        width: 10,
        height: 10,
        borderRadius: "0px",
      });
    }
    setElementBounds(boundsByElement);

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 300, height: 300 },
      { x: 299, y: 299 },
      () => true,
    );

    expect(elements).toHaveLength(DRAG_SELECTION_MAX_NEIGHBOR_SCAN_ELEMENTS + 1);
  });

  it("does not scan children from an unbounded local collection", () => {
    const childElements = Array.from(
      { length: DRAG_SELECTION_MAX_LOCAL_COLLECTION_ELEMENTS + 1 },
      () => createElement(),
    );
    const containerElement = createElement(childElements);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement]);
    setElementBounds(
      new Map([[containerElement, { x: 0, y: 0, width: 200, height: 200, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 25, y: 25, width: 50, height: 50 },
      { x: 50, y: 50 },
      () => true,
    );

    expect(elements).toEqual([containerElement]);
    expect(createElementBounds).toHaveBeenCalledOnce();
  });

  it("bounds sampling work for enormous drag rectangles", () => {
    getElementsInDrag(
      { x: -1_000_000, y: -1_000_000, width: 2_000_000, height: 2_000_000 },
      { x: 150, y: 150 },
      () => true,
    );

    expect(vi.mocked(getDeepElementsAtPoint).mock.calls.length).toBeLessThanOrEqual(
      DRAG_SELECTION_MAX_TOTAL_SAMPLE_POINTS + 10,
    );
    for (const [clientX, clientY] of vi.mocked(getDeepElementsAtPoint).mock.calls) {
      expect(clientX).toBeGreaterThanOrEqual(0);
      expect(clientX).toBeLessThan(300);
      expect(clientY).toBeGreaterThanOrEqual(0);
      expect(clientY).toBeLessThan(300);
    }
  });

  it("does not hit test an empty drag rectangle", () => {
    expect(
      getElementsInDrag({ x: 100, y: 100, width: 0, height: 100 }, { x: 100, y: 150 }, () => true),
    ).toEqual([]);
    expect(getDeepElementsAtPoint).not.toHaveBeenCalled();
    expect(suspendPointerEventsFreeze).toHaveBeenCalledOnce();
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
  });

  it("restores pointer-event freezing when a sampled hit test throws", () => {
    vi.mocked(getDeepElementsAtPoint).mockImplementation(() => {
      throw new Error("hit test failed");
    });

    expect(() =>
      getElementsInDrag(
        { x: 100, y: 100, width: 100, height: 100 },
        { x: 150, y: 150 },
        () => true,
      ),
    ).toThrow("hit test failed");
    expect(suspendPointerEventsFreeze).toHaveBeenCalledOnce();
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
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

  it("includes a candidate at the exact coverage threshold", () => {
    const candidateElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([candidateElement]);
    setElementBounds(
      new Map([[candidateElement, { x: 0, y: 0, width: 30, height: 40, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 30, height: 30 },
      { x: 29, y: 29 },
      () => true,
    );

    expect(elements).toEqual([candidateElement]);
  });

  it("does not select empty space inside a wide text element", () => {
    const textElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([textElement]);
    vi.mocked(getElementTextBounds).mockReturnValue([
      { x: 10, y: 10, width: 100, height: 20, borderRadius: "0px" },
    ]);
    setElementBounds(
      new Map([[textElement, { x: 10, y: 10, width: 280, height: 20, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 220, y: 10, width: 60, height: 20 },
      { x: 275, y: 20 },
      () => true,
    );

    expect(elements).toEqual([]);
  });

  it("selects a wide text element when the drag covers its painted text", () => {
    const textElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([textElement]);
    vi.mocked(getElementTextBounds).mockReturnValue([
      { x: 10, y: 10, width: 100, height: 20, borderRadius: "0px" },
    ]);
    setElementBounds(
      new Map([[textElement, { x: 10, y: 10, width: 280, height: 20, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 10, y: 10, width: 100, height: 20 },
      { x: 105, y: 20 },
      () => true,
    );

    expect(elements).toEqual([textElement]);
  });

  it("selects painted text from multiple exposed wide elements", () => {
    const firstTextElement = createElement();
    const secondTextElement = createElement();
    vi.mocked(compareElementDocumentOrder).mockImplementation((firstElement, secondElement) => {
      if (firstElement === secondElement) return 0;
      return firstElement === firstTextElement ? -1 : 1;
    });
    vi.mocked(getDeepElementsAtPoint).mockImplementation((_clientX, clientY) =>
      clientY < 50 ? [firstTextElement] : [secondTextElement],
    );
    vi.mocked(getElementTextBounds).mockImplementation((element) =>
      element === firstTextElement
        ? [{ x: 0, y: 10, width: 100, height: 20, borderRadius: "0px" }]
        : [{ x: 0, y: 70, width: 100, height: 20, borderRadius: "0px" }],
    );
    setElementBounds(
      new Map([
        [firstTextElement, { x: 0, y: 0, width: 280, height: 40, borderRadius: "0px" }],
        [secondTextElement, { x: 0, y: 60, width: 280, height: 40, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 95, y: 95 },
      () => true,
    );

    expect(elements).toEqual([firstTextElement, secondTextElement]);
  });

  it("keeps wrapped text line gaps out of drag geometry", () => {
    const textElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([textElement]);
    vi.mocked(getElementTextBounds).mockReturnValue([
      { x: 10, y: 10, width: 100, height: 20, borderRadius: "0px" },
      { x: 10, y: 30, width: 40, height: 20, borderRadius: "0px" },
    ]);
    setElementBounds(
      new Map([[textElement, { x: 10, y: 10, width: 280, height: 40, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 60, y: 30, width: 40, height: 20 },
      { x: 95, y: 40 },
      () => true,
    );

    expect(elements).toEqual([]);
  });

  it("does not promote small text behind a covered foreground target", () => {
    const backgroundTextElement = createElement();
    const foregroundElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([foregroundElement, backgroundTextElement]);
    vi.mocked(getElementTextBounds).mockImplementation((element) =>
      element === backgroundTextElement
        ? [{ x: 20, y: 20, width: 60, height: 20, borderRadius: "0px" }]
        : null,
    );
    setElementBounds(
      new Map([
        [backgroundTextElement, { x: 0, y: 0, width: 300, height: 100, borderRadius: "0px" }],
        [foregroundElement, { x: 40, y: 40, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50 },
      () => true,
    );

    expect(elements).toEqual([foregroundElement]);
  });

  it("does not promote wide text that is exposed at one sample but covered at another", () => {
    const backgroundTextElement = createElement();
    const foregroundElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockImplementation((clientX) =>
      clientX < 50 ? [foregroundElement, backgroundTextElement] : [backgroundTextElement],
    );
    vi.mocked(getElementTextBounds).mockImplementation((element) =>
      element === backgroundTextElement
        ? [{ x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }]
        : null,
    );
    setElementBounds(
      new Map([
        [backgroundTextElement, { x: 0, y: 0, width: 300, height: 100, borderRadius: "0px" }],
        [foregroundElement, { x: 0, y: 0, width: 50, height: 100, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 95, y: 50 },
      () => true,
    );

    expect(elements).toEqual([foregroundElement]);
  });

  it("validates a sampled candidate once across the drag", () => {
    const candidateElement = createElement();
    const isValidGrabbableElement = vi.fn(() => true);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([candidateElement]);
    setElementBounds(
      new Map([[candidateElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }]]),
    );

    getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 95, y: 95 },
      isValidGrabbableElement,
    );

    expect(isValidGrabbableElement).toHaveBeenCalledOnce();
  });

  it("prefers a text child over its text-flow parent for a partial drag", () => {
    const labelElement = createElement();
    const containerElement = createElement([labelElement]);
    const sharedTextBounds = [{ x: 150, y: 110, width: 110, height: 30, borderRadius: "0px" }];
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(labelElement);
    vi.mocked(getElementTextBounds).mockReturnValue(sharedTextBounds);
    setElementBounds(
      new Map([
        [containerElement, { x: 40, y: 80, width: 220, height: 80, borderRadius: "0px" }],
        [labelElement, { x: 150, y: 110, width: 120, height: 30, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 90, width: 90, height: 35 },
      { x: 190, y: 125 },
      () => true,
    );

    expect(elements).toEqual([labelElement]);
  });

  it("excludes a candidate that only touches the drag edge", () => {
    const candidateElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([candidateElement]);
    setElementBounds(
      new Map([[candidateElement, { x: 100, y: 0, width: 50, height: 100, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 99, y: 50 },
      () => true,
    );

    expect(elements).toEqual([]);
    expect(getElementTextBounds).not.toHaveBeenCalled();
  });

  it("returns all covered candidates in document order", () => {
    const laterElement = createElement();
    const earlierElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([laterElement, earlierElement]);
    vi.mocked(compareElementDocumentOrder).mockImplementation((leftElement, rightElement) =>
      leftElement === earlierElement && rightElement === laterElement ? -1 : 1,
    );
    setElementBounds(
      new Map([
        [laterElement, { x: 60, y: 60, width: 20, height: 20, borderRadius: "0px" }],
        [earlierElement, { x: 20, y: 20, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 75, y: 75 },
      () => true,
    );

    expect(elements).toEqual([earlierElement, laterElement]);
  });

  it("keeps the ancestor when ordinary nested candidates both qualify", () => {
    const childElement = createElement();
    const parentElement = createElement([childElement]);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([childElement, parentElement]);
    vi.mocked(getComposedParentElement).mockImplementation((element) =>
      element === childElement ? parentElement : null,
    );
    setElementBounds(
      new Map([
        [parentElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }],
        [childElement, { x: 10, y: 10, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 20, y: 20 },
      () => true,
    );

    expect(elements).toEqual([parentElement]);
  });

  it("keeps the inner candidate instead of its open shadow host", () => {
    const shadowElement = createElement();
    const shadowHostElement = createElement();
    const shadowRoot = Object.assign(Object.create(null), { host: shadowHostElement });
    Object.assign(shadowElement, { getRootNode: () => shadowRoot });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([shadowElement, shadowHostElement]);
    vi.mocked(compareElementDocumentOrder).mockImplementation((leftElement, rightElement) =>
      leftElement === shadowHostElement && rightElement === shadowElement ? -1 : 1,
    );
    vi.mocked(getComposedParentElement).mockImplementation((element) =>
      element === shadowElement ? shadowHostElement : null,
    );
    vi.mocked(isShadowRoot).mockImplementation((rootNode) => rootNode === shadowRoot);
    setElementBounds(
      new Map([
        [shadowHostElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }],
        [shadowElement, { x: 10, y: 10, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 20, y: 20 },
      () => true,
    );

    expect(elements).toEqual([shadowElement]);
  });

  it("skips accessible iframe shells while keeping their deep content", () => {
    const iframeElement = createElement();
    const frameContentElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([frameContentElement, iframeElement]);
    vi.mocked(isIframeElement).mockImplementation((element) => element === iframeElement);
    vi.mocked(getAccessibleIframeDocument).mockImplementation((element) =>
      element === iframeElement ? Object.create(null) : null,
    );
    setElementBounds(
      new Map([
        [iframeElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }],
        [frameContentElement, { x: 10, y: 10, width: 20, height: 20, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 20, y: 20 },
      () => true,
    );

    expect(elements).toEqual([frameContentElement]);
  });

  it("keeps an inaccessible iframe as a selectable fallback", () => {
    const iframeElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([iframeElement]);
    vi.mocked(isIframeElement).mockReturnValue(true);
    setElementBounds(
      new Map([[iframeElement, { x: 0, y: 0, width: 100, height: 100, borderRadius: "0px" }]]),
    );

    const elements = getElementsInDrag(
      { x: 25, y: 25, width: 50, height: 50 },
      { x: 50, y: 50 },
      () => true,
    );

    expect(elements).toEqual([iframeElement]);
  });

  it("filters roots, out-of-scope layers, and invalid overlays before fallback ranking", () => {
    const rootElement = createElement();
    const outOfScopeElement = createElement();
    const invalidOverlayElement = createElement();
    const targetElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([
      rootElement,
      outOfScopeElement,
      invalidOverlayElement,
      targetElement,
    ]);
    vi.mocked(isRootElement).mockImplementation((element) => element === rootElement);
    vi.mocked(isWithinScope).mockImplementation((element) => element !== outOfScopeElement);
    setElementBounds(
      new Map([
        [invalidOverlayElement, { x: 100, y: 100, width: 10, height: 10, borderRadius: "0px" }],
        [targetElement, { x: 50, y: 50, width: 200, height: 200, borderRadius: "0px" }],
      ]),
    );

    const elements = getElementsInDrag(
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 150, y: 150 },
      (element) => element !== invalidOverlayElement,
    );

    expect(elements).toEqual([targetElement]);
    expect(createElementBounds).toHaveBeenCalledOnce();
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
