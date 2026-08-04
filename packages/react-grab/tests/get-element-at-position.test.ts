import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearElementPositionCache,
  getElementAtPosition,
} from "../src/utils/get-element-at-position.js";
import { getDeepElementAtPoint } from "../src/utils/get-deep-element-at-point.js";
import { getDeepFallbackElementAtPoint } from "../src/utils/get-deep-fallback-element-at-point.js";
import { getSvgTextElementAtPoint } from "../src/utils/get-svg-text-element-at-point.js";
import { isValidGrabbableElement } from "../src/utils/is-valid-grabbable-element.js";

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

vi.mock("../src/utils/get-svg-text-element-at-point.js", () => ({
  getSvgTextElementAtPoint: vi.fn(() => null),
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
    localName,
    namespaceURI: "http://www.w3.org/2000/svg",
  });

beforeEach(() => {
  clearElementPositionCache();
  vi.clearAllMocks();
});

afterEach(() => {
  clearElementPositionCache();
});

describe("getElementAtPosition", () => {
  it("refines cached SVG hits when the pointer enters a text label", () => {
    const svgElement = createSvgElement("svg");
    const textElement = createSvgElement("text");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getSvgTextElementAtPoint).mockReturnValueOnce(null).mockReturnValueOnce(textElement);

    expect(getElementAtPosition(10, 10)).toBe(svgElement);
    expect(getElementAtPosition(11, 11)).toBe(textElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
  });

  it("restores the cached native SVG hit when the pointer leaves a text label", () => {
    const svgElement = createSvgElement("svg");
    const textElement = createSvgElement("text");
    vi.mocked(getDeepElementAtPoint).mockReturnValue(svgElement);
    vi.mocked(getSvgTextElementAtPoint).mockReturnValueOnce(textElement).mockReturnValueOnce(null);

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
    vi.mocked(getSvgTextElementAtPoint).mockReturnValueOnce(textElement).mockReturnValueOnce(null);
    vi.mocked(isValidGrabbableElement).mockImplementation((element) => element !== svgElement);

    expect(getElementAtPosition(10, 10)).toBe(textElement);
    expect(getElementAtPosition(11, 11)).toBe(fallbackElement);
    expect(getDeepElementAtPoint).toHaveBeenCalledOnce();
    expect(getDeepFallbackElementAtPoint).toHaveBeenCalledOnce();
  });
});
