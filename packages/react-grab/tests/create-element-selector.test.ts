import { describe, expect, it } from "vite-plus/test";
import { createSemanticElementSelectorDetails } from "../src/utils/create-element-selector.js";

interface SelectorTestElementOptions {
  attributes: Record<string, string>;
  matchingSelectors: Set<string>;
}

const createSelectorTestElement = (options: SelectorTestElementOptions): Element => {
  const element = Object.create(null);
  const ownerDocument = {
    body: Object.create(null),
    defaultView: null,
    documentElement: Object.create(null),
    querySelectorAll: (selector: string) =>
      options.matchingSelectors.has(selector) ? [element] : [],
  };
  element.getAttribute = (attributeName: string) => options.attributes[attributeName] ?? null;
  element.getRootNode = () => ownerDocument;
  element.ownerDocument = ownerDocument;
  element.tagName = "DIV";
  return element;
};

describe("createSemanticElementSelectorDetails", () => {
  it("does not treat a weak role as a semantic selector", () => {
    const element = createSelectorTestElement({
      attributes: {
        "data-testid": "repeated-icon",
        role: "img",
      },
      matchingSelectors: new Set(['[role="img"]', 'div[role="img"]']),
    });

    expect(createSemanticElementSelectorDetails(element)).toBe(null);
  });

  it("keeps actionable roles as semantic selectors", () => {
    const element = createSelectorTestElement({
      attributes: {
        role: "button",
      },
      matchingSelectors: new Set(['[role="button"]']),
    });

    expect(createSemanticElementSelectorDetails(element)).toEqual({
      selector: '[role="button"]',
      isSemantic: true,
    });
  });
});
