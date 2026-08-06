import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearElementPositionCache,
  getElementAtPosition,
  getElementsAtPoint,
} from "../src/utils/get-element-at-position.js";
import { resolveThreeElementAtPoint } from "../src/core/three-selection.js";
import { createElementBounds } from "../src/utils/create-element-bounds.js";
import { getAccessibleIframeDocument } from "../src/utils/get-accessible-iframe-document.js";
import { getDeepElementAtPoint } from "../src/utils/get-deep-element-at-point.js";
import { getDeepElementsAtPoint } from "../src/utils/get-deep-elements-at-point.js";
import { getDeepFallbackElementAtPoint } from "../src/utils/get-deep-fallback-element-at-point.js";
import { getLocalContentElementAtPoint } from "../src/utils/get-local-content-element-at-point.js";
import { isIframeElement } from "../src/utils/is-iframe-element.js";
import { isValidGrabbableElement } from "../src/utils/is-valid-grabbable-element.js";
import {
  resumePointerEventsFreeze,
  suspendPointerEventsFreeze,
} from "../src/utils/pointer-events-freeze.js";
import { getScopeContainer, isWithinScope } from "../src/utils/runtime-mode.js";
import { ELEMENT_POSITION_THROTTLE_MS } from "../src/constants.js";

vi.mock("../src/core/three-selection.js", () => ({
  resolveThreeElementAtPoint: vi.fn((element) => element),
}));

vi.mock("../src/utils/create-element-bounds.js", () => ({
  createElementBounds: vi.fn(),
}));

vi.mock("../src/utils/get-accessible-iframe-document.js", () => ({
  getAccessibleIframeDocument: vi.fn(() => null),
}));

vi.mock("../src/utils/get-deep-element-at-point.js", () => ({
  getDeepElementAtPoint: vi.fn(),
}));

vi.mock("../src/utils/get-deep-elements-at-point.js", () => ({
  getDeepElementsAtPoint: vi.fn(() => []),
}));

vi.mock("../src/utils/get-deep-fallback-element-at-point.js", () => ({
  getDeepFallbackElementAtPoint: vi.fn(() => null),
}));

vi.mock("../src/utils/get-local-content-element-at-point.js", () => ({
  getLocalContentElementAtPoint: vi.fn(() => null),
}));

vi.mock("../src/utils/is-iframe-element.js", () => ({
  isIframeElement: vi.fn(() => false),
}));

vi.mock("../src/utils/is-valid-grabbable-element.js", () => ({
  isValidGrabbableElement: vi.fn(() => true),
}));

vi.mock("../src/utils/pointer-events-freeze.js", () => ({
  resumePointerEventsFreeze: vi.fn(),
  suspendPointerEventsFreeze: vi.fn(),
}));

vi.mock("../src/utils/runtime-mode.js", () => ({
  getScopeContainer: vi.fn(() => null),
  isWithinScope: vi.fn(() => true),
}));

const createSvgElement = (localName: string): Element =>
  Object.assign(Object.create(null), {
    getRootNode: () => Object.create(null),
    localName,
    namespaceURI: "http://www.w3.org/2000/svg",
    parentElement: null,
  });

const createHtmlElement = (localName: string): Element =>
  Object.assign(Object.create(null), {
    getRootNode: () => Object.create(null),
    localName,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    parentElement: null,
  });

beforeEach(() => {
  clearElementPositionCache();
  vi.resetAllMocks();
  vi.stubGlobal("performance", { now: vi.fn(() => 0) });
  vi.mocked(createElementBounds).mockReset();
  vi.mocked(getAccessibleIframeDocument).mockReturnValue(null);
  vi.mocked(getDeepElementAtPoint).mockReturnValue(null);
  vi.mocked(getDeepElementsAtPoint).mockReturnValue([]);
  vi.mocked(getDeepFallbackElementAtPoint).mockReturnValue(null);
  vi.mocked(getLocalContentElementAtPoint).mockReturnValue(null);
  vi.mocked(getScopeContainer).mockReturnValue(null);
  vi.mocked(isIframeElement).mockReturnValue(false);
  vi.mocked(isValidGrabbableElement).mockReturnValue(true);
  vi.mocked(isWithinScope).mockReturnValue(true);
  vi.mocked(resolveThreeElementAtPoint).mockImplementation((element) => element);
});

afterEach(() => {
  clearElementPositionCache();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getElementAtPosition", () => {
  it("rejects non-finite coordinates without hit testing", () => {
    expect(getElementAtPosition(Number.NaN, 10)).toBeNull();
    expect(getElementAtPosition(10, Number.POSITIVE_INFINITY)).toBeNull();
    expect(getDeepElementAtPoint).not.toHaveBeenCalled();
    expect(suspendPointerEventsFreeze).not.toHaveBeenCalled();
  });

  it("does not refine cached HTML hits without a local content match", () => {
    const htmlElement = createHtmlElement("li");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(htmlElement);

    expect(getElementAtPosition(10, 10)).toBe(htmlElement);
    expect(getElementAtPosition(11, 11)).toBe(htmlElement);
    expect(getLocalContentElementAtPoint).toHaveBeenCalledOnce();
  });

  it("refreshes the hit target after a fast pointer jump", () => {
    const firstElement = createHtmlElement("li");
    const secondElement = createHtmlElement("button");
    vi.mocked(getDeepElementAtPoint)
      .mockReturnValueOnce(firstElement)
      .mockReturnValueOnce(secondElement);

    expect(getElementAtPosition(10, 10)).toBe(firstElement);
    vi.mocked(performance.now).mockReturnValue(1);
    expect(getElementAtPosition(100, 100)).toBe(secondElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledTimes(2);
  });

  it("refreshes a nearby hit after the cache throttle expires", () => {
    const firstElement = createHtmlElement("li");
    const secondElement = createHtmlElement("button");
    vi.mocked(getDeepElementAtPoint)
      .mockReturnValueOnce(firstElement)
      .mockReturnValueOnce(secondElement);

    expect(getElementAtPosition(10, 10)).toBe(firstElement);
    vi.mocked(performance.now).mockReturnValue(ELEMENT_POSITION_THROTTLE_MS + 1);
    expect(getElementAtPosition(11, 11)).toBe(secondElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledTimes(2);
  });

  it("uses the deep fallback when the top paint layer is invalid", () => {
    const overlayElement = createHtmlElement("div");
    const targetElement = createHtmlElement("button");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(overlayElement);
    vi.mocked(getDeepFallbackElementAtPoint).mockReturnValue(targetElement);
    vi.mocked(isValidGrabbableElement).mockImplementation((element) => element !== overlayElement);

    expect(getElementAtPosition(10, 10)).toBe(targetElement);
    expect(getDeepFallbackElementAtPoint).toHaveBeenCalledWith(10, 10);
  });

  it("falls back to the native hit when refined local content is invalid", () => {
    const nativeElement = createHtmlElement("button");
    const localContentElement = createHtmlElement("span");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(nativeElement);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(localContentElement);
    vi.mocked(isValidGrabbableElement).mockImplementation(
      (element) => element !== localContentElement,
    );

    expect(getElementAtPosition(10, 10)).toBe(nativeElement);
  });

  it("falls back to the native hit when refined local content is out of scope", () => {
    const nativeElement = createHtmlElement("button");
    const localContentElement = createHtmlElement("span");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(nativeElement);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(localContentElement);
    vi.mocked(isWithinScope).mockImplementation((element) => element !== localContentElement);

    expect(getElementAtPosition(10, 10)).toBe(nativeElement);
  });

  it("restores pointer-event freezing after a failed deep hit test", () => {
    vi.useFakeTimers();
    vi.mocked(getDeepElementAtPoint).mockImplementation(() => {
      throw new Error("hit test failed");
    });

    expect(() => getElementAtPosition(10, 10)).toThrow("hit test failed");
    expect(suspendPointerEventsFreeze).toHaveBeenCalledOnce();
    expect(resumePointerEventsFreeze).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
  });

  it("reuses an inaccessible iframe only while the point remains inside fresh bounds", () => {
    const iframeElement = Object.assign(createHtmlElement("iframe"), { isConnected: true });
    const outsideElement = createHtmlElement("button");
    vi.mocked(getDeepElementAtPoint)
      .mockReturnValueOnce(iframeElement)
      .mockReturnValueOnce(outsideElement);
    vi.mocked(isIframeElement).mockImplementation((element) => element === iframeElement);
    vi.mocked(createElementBounds).mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      borderRadius: "0px",
    });

    expect(getElementAtPosition(10, 10)).toBe(iframeElement);
    vi.mocked(performance.now).mockReturnValue(1);
    expect(getElementAtPosition(20, 20)).toBe(iframeElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();

    expect(getElementAtPosition(120, 120)).toBe(outsideElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledTimes(2);
  });

  it("invalidates an iframe cache when the frame becomes accessible", () => {
    const iframeElement = Object.assign(createHtmlElement("iframe"), { isConnected: true });
    const frameContentElement = createHtmlElement("button");
    let accessibleDocument: Document | null = null;
    vi.mocked(getDeepElementAtPoint)
      .mockReturnValueOnce(iframeElement)
      .mockReturnValueOnce(frameContentElement);
    vi.mocked(isIframeElement).mockImplementation((element) => element === iframeElement);
    vi.mocked(getAccessibleIframeDocument).mockImplementation(() => accessibleDocument);
    vi.mocked(createElementBounds).mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      borderRadius: "0px",
    });

    expect(getElementAtPosition(10, 10)).toBe(iframeElement);
    accessibleDocument = Object.create(null);
    vi.mocked(performance.now).mockReturnValue(1);
    expect(getElementAtPosition(20, 20)).toBe(frameContentElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledTimes(2);
  });

  it("refines cached SVG hits when the pointer enters a text label", () => {
    const svgElement = createSvgElement("svg");
    const textElement = createSvgElement("text");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getLocalContentElementAtPoint)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(textElement);

    expect(getElementAtPosition(10, 10)).toBe(svgElement);
    expect(getElementAtPosition(11, 11)).toBe(textElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
  });

  it("restores the cached native SVG hit when the pointer leaves a text label", () => {
    const svgElement = createSvgElement("svg");
    const textElement = createSvgElement("text");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getLocalContentElementAtPoint)
      .mockReturnValueOnce(textElement)
      .mockReturnValueOnce(null);

    expect(getElementAtPosition(10, 10)).toBe(textElement);
    expect(getElementAtPosition(11, 11)).toBe(svgElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
  });

  it("preserves a cached deep fallback when the native SVG hit is invalid", () => {
    const svgElement = createSvgElement("svg");
    const fallbackElement: Element = Object.create(null);
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getDeepFallbackElementAtPoint).mockReturnValue(fallbackElement);
    vi.mocked(isValidGrabbableElement).mockImplementation((element) => element !== svgElement);

    expect(getElementAtPosition(10, 10)).toBe(fallbackElement);
    expect(getElementAtPosition(11, 11)).toBe(fallbackElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
    expect(getDeepFallbackElementAtPoint).toHaveBeenCalledOnce();
  });

  it("restores the deep fallback after leaving refined SVG text", () => {
    const svgElement = createSvgElement("svg");
    const textElement = createSvgElement("text");
    const fallbackElement: Element = Object.create(null);
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getDeepFallbackElementAtPoint).mockReturnValue(fallbackElement);
    vi.mocked(getLocalContentElementAtPoint)
      .mockReturnValueOnce(textElement)
      .mockReturnValueOnce(null);
    vi.mocked(isValidGrabbableElement).mockImplementation((element) => element !== svgElement);

    expect(getElementAtPosition(10, 10)).toBe(textElement);
    expect(getElementAtPosition(11, 11)).toBe(fallbackElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
    expect(getDeepFallbackElementAtPoint).toHaveBeenCalledOnce();
  });
});

describe("getElementsAtPoint", () => {
  it("replaces lower native layers with the refined hierarchy", () => {
    const ignoredOverlayElement = createHtmlElement("div");
    const localContentElement = createHtmlElement("span");
    const containerElement = Object.assign(createHtmlElement("button"), {
      contains: (element: Element) => element === localContentElement,
    });
    Object.assign(localContentElement, { parentElement: containerElement });
    const lowerElement = createHtmlElement("section");
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([
      ignoredOverlayElement,
      containerElement,
      lowerElement,
    ]);
    vi.mocked(getLocalContentElementAtPoint).mockImplementation((element) =>
      element === containerElement ? localContentElement : null,
    );
    vi.mocked(isValidGrabbableElement).mockImplementation(
      (element) => element !== ignoredOverlayElement,
    );

    expect(getElementsAtPoint(10, 10)).toEqual([
      ignoredOverlayElement,
      localContentElement,
      containerElement,
    ]);
    expect(getLocalContentElementAtPoint).toHaveBeenCalledTimes(2);
    expect(getLocalContentElementAtPoint).not.toHaveBeenCalledWith(lowerElement, 10, 10);
  });

  it("preserves the native layer when local content is invalid", () => {
    const ignoredContentElement = createHtmlElement("span");
    const containerElement = Object.assign(createHtmlElement("button"), {
      contains: (element: Element) => element === ignoredContentElement,
    });
    const lowerElement = createHtmlElement("section");
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement, lowerElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(ignoredContentElement);
    vi.mocked(isValidGrabbableElement).mockImplementation(
      (element) => element !== ignoredContentElement,
    );

    expect(getElementsAtPoint(10, 10)).toEqual([containerElement, lowerElement]);
  });

  it("inserts pointer-disabled ancestors before the native layer", () => {
    const containerElement = createHtmlElement("button");
    const parentElement = Object.assign(createHtmlElement("span"), {
      parentElement: containerElement,
    });
    const localContentElement = Object.assign(createHtmlElement("strong"), {
      parentElement,
    });
    Object.assign(containerElement, {
      contains: (element: Element) => element === parentElement || element === localContentElement,
    });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(localContentElement);

    expect(getElementsAtPoint(10, 10)).toEqual([
      localContentElement,
      parentElement,
      containerElement,
    ]);
  });

  it("skips a native SVG sibling behind refined text", () => {
    const svgElement = createSvgElement("svg");
    const shapeElement = createSvgElement("rect");
    const labelGroupElement = Object.assign(createSvgElement("g"), {
      parentElement: svgElement,
    });
    const localTextElement = Object.assign(createSvgElement("text"), {
      parentElement: labelGroupElement,
    });
    const lowerElement = createHtmlElement("section");
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([shapeElement, svgElement, lowerElement]);
    vi.mocked(getLocalContentElementAtPoint).mockImplementation((element) =>
      element === shapeElement ? localTextElement : null,
    );

    expect(getElementsAtPoint(10, 10)).toEqual([localTextElement, labelGroupElement, svgElement]);
  });

  it("does not repeat an inserted ancestor that is also in the native stack", () => {
    const containerElement = createHtmlElement("button");
    const parentElement = Object.assign(createHtmlElement("span"), {
      parentElement: containerElement,
    });
    const localContentElement = Object.assign(createHtmlElement("strong"), {
      parentElement,
    });
    Object.assign(containerElement, {
      contains: (element: Element) => element === parentElement || element === localContentElement,
    });
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([containerElement, parentElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(localContentElement);

    expect(getElementsAtPoint(10, 10)).toEqual([
      localContentElement,
      parentElement,
      containerElement,
    ]);
  });

  it("stops the refined hierarchy at the scope boundary", () => {
    const outsideElement = createHtmlElement("main");
    const scopedElement = Object.assign(createHtmlElement("section"), {
      parentElement: outsideElement,
    });
    const localContentElement = Object.assign(createHtmlElement("span"), {
      parentElement: scopedElement,
    });
    const scopeContainer: HTMLElement = Object.create(null);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([scopedElement]);
    vi.mocked(getLocalContentElementAtPoint).mockReturnValue(localContentElement);
    vi.mocked(getScopeContainer).mockReturnValue(scopeContainer);
    vi.mocked(isWithinScope).mockImplementation((element) => element !== outsideElement);

    expect(getElementsAtPoint(10, 10)).toEqual([localContentElement, scopedElement]);
  });

  it("filters out-of-scope stack layers before local refinement", () => {
    const outsideElement = createHtmlElement("div");
    const insideElement = createHtmlElement("button");
    const scopeElement: HTMLElement = Object.create(null);
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([outsideElement, insideElement]);
    vi.mocked(getScopeContainer).mockReturnValue(scopeElement);
    vi.mocked(isWithinScope).mockImplementation((element) => element !== outsideElement);

    expect(getElementsAtPoint(10, 10)).toEqual([insideElement]);
    expect(getLocalContentElementAtPoint).toHaveBeenCalledOnce();
    expect(getLocalContentElementAtPoint).toHaveBeenCalledWith(insideElement, 10, 10);
  });

  it("schedules freeze restoration when deep stack collection throws", () => {
    vi.useFakeTimers();
    vi.mocked(getDeepElementsAtPoint).mockImplementation(() => {
      throw new Error("stack failed");
    });

    expect(() => getElementsAtPoint(10, 10)).toThrow("stack failed");
    vi.runAllTimers();
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
  });
});
