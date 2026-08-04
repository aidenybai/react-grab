import { describe, expect, it, vi } from "vite-plus/test";
import { SVG_TEXT_HIT_TEST_MAX_ELEMENTS } from "../src/constants.js";
import { getSvgTextElementAtPoint } from "../src/utils/get-svg-text-element-at-point.js";

interface MockElementOptions {
  bottom?: number;
  left?: number;
  localName?: string;
  namespaceURI?: string;
  right?: number;
  top?: number;
}

const createMockElement = (options: MockElementOptions = {}): Element => {
  const element: Element = Object.create(null);
  Object.assign(element, {
    localName: options.localName ?? "g",
    namespaceURI: options.namespaceURI ?? "http://www.w3.org/2000/svg",
    lastElementChild: null,
    ownerDocument: { defaultView: null },
    parentElement: null,
    previousElementSibling: null,
    getBoundingClientRect: vi.fn(() => ({
      bottom: options.bottom ?? 20,
      height: (options.bottom ?? 20) - (options.top ?? 10),
      left: options.left ?? 10,
      right: options.right ?? 20,
      top: options.top ?? 10,
      width: (options.right ?? 20) - (options.left ?? 10),
    })),
  });
  return element;
};

const appendMockChild = (parentElement: Element, childElement: Element): void => {
  Object.assign(childElement, {
    parentElement,
    previousElementSibling: parentElement.lastElementChild,
  });
  Object.assign(parentElement, { lastElementChild: childElement });
};

describe("getSvgTextElementAtPoint", () => {
  it("finds SVG text skipped by native pointer hit testing", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const groupElement = createMockElement();
    const textElement = createMockElement({ localName: "text" });
    appendMockChild(svgElement, groupElement);
    appendMockChild(groupElement, textElement);

    expect(getSvgTextElementAtPoint(svgElement, 15, 15)).toBe(textElement);
  });

  it("prefers the last painted overlapping text element", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const firstTextElement = createMockElement({ localName: "text" });
    const lastTextElement = createMockElement({ localName: "text" });
    appendMockChild(svgElement, firstTextElement);
    appendMockChild(svgElement, lastTextElement);

    expect(getSvgTextElementAtPoint(svgElement, 15, 15)).toBe(lastTextElement);
  });

  it("finds overlapping text outside the native hit subtree", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const shapeGroupElement = createMockElement();
    const shapeElement = createMockElement({ localName: "rect" });
    const labelGroupElement = createMockElement();
    const textElement = createMockElement({ localName: "text" });
    appendMockChild(svgElement, shapeGroupElement);
    appendMockChild(shapeGroupElement, shapeElement);
    appendMockChild(svgElement, labelGroupElement);
    appendMockChild(labelGroupElement, textElement);

    expect(getSvgTextElementAtPoint(shapeElement, 15, 15)).toBe(textElement);
  });

  it("does not select overlapping text painted behind the native hit", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const textElement = createMockElement({ localName: "text" });
    const shapeElement = createMockElement({ localName: "rect" });
    appendMockChild(svgElement, textElement);
    appendMockChild(svgElement, shapeElement);

    expect(getSvgTextElementAtPoint(shapeElement, 15, 15)).toBeNull();
  });

  it("limits traversal to the nearest owning SVG", () => {
    const outerSvgElement = createMockElement({ localName: "svg" });
    const innerSvgElement = createMockElement({ localName: "svg" });
    const shapeElement = createMockElement({ localName: "rect" });
    const textElement = createMockElement({ localName: "text" });
    appendMockChild(outerSvgElement, innerSvgElement);
    appendMockChild(innerSvgElement, shapeElement);
    appendMockChild(innerSvgElement, textElement);

    for (let index = 0; index < SVG_TEXT_HIT_TEST_MAX_ELEMENTS; index += 1) {
      appendMockChild(outerSvgElement, createMockElement());
    }

    expect(getSvgTextElementAtPoint(shapeElement, 15, 15)).toBe(textElement);
  });

  it("ignores text whose painted bounds do not contain the pointer", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const textElement = createMockElement({
      bottom: 40,
      left: 30,
      localName: "text",
      right: 40,
      top: 30,
    });
    appendMockChild(svgElement, textElement);

    expect(getSvgTextElementAtPoint(svgElement, 15, 15)).toBeNull();
  });

  it("does not search non-SVG containers", () => {
    const containerElement = createMockElement({
      localName: "div",
      namespaceURI: "http://www.w3.org/1999/xhtml",
    });
    const textElement = createMockElement({ localName: "text" });
    appendMockChild(containerElement, textElement);

    expect(getSvgTextElementAtPoint(containerElement, 15, 15)).toBeNull();
    expect(textElement.getBoundingClientRect).not.toHaveBeenCalled();
  });

  it("bounds traversal in large SVG trees", () => {
    const svgElement = createMockElement({ localName: "svg" });
    const targetTextElement = createMockElement({ localName: "text" });
    appendMockChild(svgElement, targetTextElement);

    for (let index = 0; index < SVG_TEXT_HIT_TEST_MAX_ELEMENTS; index += 1) {
      appendMockChild(svgElement, createMockElement());
    }

    expect(getSvgTextElementAtPoint(svgElement, 15, 15)).toBeNull();
    expect(targetTextElement.getBoundingClientRect).not.toHaveBeenCalled();
  });
});
