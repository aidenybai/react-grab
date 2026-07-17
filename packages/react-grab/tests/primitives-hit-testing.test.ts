import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  getElementAtPoint,
  getElementBounds,
  getElementSelector,
  getElementsAtPoint,
  getElementsAtPosition,
  isElementGrabbable,
} from "../src/primitives.js";
import { createElementBounds } from "../src/utils/create-element-bounds.js";
import { createElementSelector } from "../src/utils/create-element-selector.js";
import { findSelectorTarget } from "../src/utils/find-selector-target.js";
import { getComposedParentElement } from "../src/utils/get-composed-parent-element.js";
import { getDeepElementsAtPoint } from "../src/utils/get-deep-elements-at-point.js";
import { isValidGrabbableElement } from "../src/utils/is-valid-grabbable-element.js";
import {
  resumePointerEventsFreeze,
  suspendPointerEventsFreeze,
} from "../src/utils/pointer-events-freeze.js";

vi.mock("../src/utils/create-element-bounds.js", () => ({
  createElementBounds: vi.fn(),
}));

vi.mock("../src/utils/create-element-selector.js", () => ({
  createElementSelector: vi.fn(),
}));

vi.mock("../src/utils/find-selector-target.js", () => ({
  findSelectorTarget: vi.fn(),
}));

vi.mock("../src/utils/get-composed-parent-element.js", () => ({
  getComposedParentElement: vi.fn(),
}));

vi.mock("../src/utils/get-deep-elements-at-point.js", () => ({
  getDeepElementsAtPoint: vi.fn(),
}));

vi.mock("../src/utils/is-valid-grabbable-element.js", () => ({
  isValidGrabbableElement: vi.fn(),
}));

vi.mock("../src/utils/pointer-events-freeze.js", () => ({
  resumePointerEventsFreeze: vi.fn(),
  suspendPointerEventsFreeze: vi.fn(),
}));

const createElement = (): Element => Object.create(null);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getDeepElementsAtPoint).mockReturnValue([]);
  vi.mocked(getComposedParentElement).mockReturnValue(null);
  vi.mocked(isValidGrabbableElement).mockReturnValue(true);
});

describe("point hit testing primitives", () => {
  it("returns the first grabbable element from the deep paint-order stack", () => {
    const overlayElement = createElement();
    const targetElement = createElement();
    const parentElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([
      overlayElement,
      targetElement,
      parentElement,
    ]);
    vi.mocked(isValidGrabbableElement).mockImplementation((element) => element !== overlayElement);

    expect(getElementAtPoint(10, 20)).toBe(targetElement);
    expect(suspendPointerEventsFreeze).toHaveBeenCalledOnce();
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
  });

  it("returns all matching elements without changing paint order", () => {
    const firstElement = createElement();
    const excludedElement = createElement();
    const lastElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([firstElement, excludedElement, lastElement]);

    expect(
      getElementsAtPoint(10, 20, {
        filter: (element) => element !== excludedElement,
      }),
    ).toEqual([firstElement, lastElement]);
    expect(isValidGrabbableElement).not.toHaveBeenCalled();
  });

  it("confines results to a composed subtree", () => {
    const outsideElement = createElement();
    const nestedElement = createElement();
    const shadowHostElement = createElement();
    const containerElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([outsideElement, nestedElement]);
    vi.mocked(getComposedParentElement).mockImplementation((element) => {
      if (element === nestedElement) return shadowHostElement;
      if (element === shadowHostElement) return containerElement;
      return null;
    });

    expect(getElementAtPoint(10, 20, { container: containerElement })).toBe(nestedElement);
  });

  it("rejects non-finite coordinates without touching the document", () => {
    expect(getElementAtPoint(Number.NaN, 20)).toBeNull();
    expect(getElementsAtPoint(10, Number.POSITIVE_INFINITY)).toEqual([]);
    expect(getDeepElementsAtPoint).not.toHaveBeenCalled();
    expect(suspendPointerEventsFreeze).not.toHaveBeenCalled();
  });

  it("always restores the pointer-events freeze after a failed hit test", () => {
    vi.mocked(getDeepElementsAtPoint).mockImplementation(() => {
      throw new Error("hit test failed");
    });

    expect(() => getElementAtPoint(10, 20)).toThrow("hit test failed");
    expect(resumePointerEventsFreeze).toHaveBeenCalledOnce();
  });

  it("preserves the raw legacy element-stack behavior", () => {
    const ignoredElement = createElement();
    vi.mocked(getDeepElementsAtPoint).mockReturnValue([ignoredElement]);
    vi.mocked(isValidGrabbableElement).mockReturnValue(false);

    expect(getElementsAtPosition(10, 20)).toEqual([ignoredElement]);
    expect(isValidGrabbableElement).not.toHaveBeenCalled();
  });
});

describe("element inspection primitives", () => {
  it("exposes the shared grabbability predicate", () => {
    const element = createElement();
    vi.mocked(isValidGrabbableElement).mockReturnValue(false);

    expect(isElementGrabbable(element)).toBe(false);
    expect(isValidGrabbableElement).toHaveBeenCalledWith(element);
  });

  it("returns isolated top-window element bounds", () => {
    const element = createElement();
    const bounds = {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      borderRadius: "8px",
    };
    vi.mocked(createElementBounds).mockReturnValue(bounds);

    const firstPublicBounds = getElementBounds(element);
    expect(firstPublicBounds).toEqual(bounds);
    expect(firstPublicBounds).not.toBe(bounds);

    firstPublicBounds.x = 100;

    const secondPublicBounds = getElementBounds(element);
    expect(secondPublicBounds).toEqual(bounds);
    expect(secondPublicBounds).not.toBe(bounds);
    expect(secondPublicBounds).not.toBe(firstPublicBounds);
  });

  it("creates a selector for the nearest useful selector target", () => {
    const element = createElement();
    const selectorTargetElement = createElement();
    vi.mocked(findSelectorTarget).mockReturnValue(selectorTargetElement);
    vi.mocked(createElementSelector).mockReturnValue("[data-testid=button]");

    expect(getElementSelector(element)).toBe("[data-testid=button]");
    expect(createElementSelector).toHaveBeenCalledWith(selectorTargetElement);
  });
});
