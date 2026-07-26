import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createSemanticElementSelectorDetails,
  type ElementSelectorDetails,
} from "../src/utils/create-element-selector.js";
import { createNearestSemanticElementSelectorDetails } from "../src/utils/create-nearest-semantic-element-selector-details.js";

vi.mock("../src/utils/create-element-selector.js", () => ({
  createSemanticElementSelectorDetails: vi.fn(),
}));

interface SelectorTargetTestElementOptions {
  hasSelectorIdentifier?: boolean;
  isSelectorTarget?: boolean;
  parentElement?: Element | null;
}

const createSelectorTargetTestElement = (
  options: SelectorTargetTestElementOptions = {},
): Element => {
  const element = Object.create(null);
  element.getAttribute = () => null;
  element.matches = (selector: string) =>
    Boolean(
      options.hasSelectorIdentifier ||
      (options.isSelectorTarget && selector.split(",").includes("button")),
    );
  element.getElementsByTagName = () => [];
  element.parentElement = options.parentElement ?? null;
  element.ownerDocument = {
    body: {
      getElementsByTagName: () => [element],
    },
    documentElement: Object.create(null),
  };
  return element;
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createNearestSemanticElementSelectorDetails", () => {
  it("continues to a unique semantic ancestor after a non-unique candidate", () => {
    const uniqueAncestor = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isSelectorTarget: true,
    });
    const repeatedCandidate = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isSelectorTarget: true,
      parentElement: uniqueAncestor,
    });
    const selectedElement = createSelectorTargetTestElement({
      parentElement: repeatedCandidate,
    });
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: '[aria-label="Save row 2"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockImplementation((candidate) =>
      candidate === uniqueAncestor ? expectedSelectorDetails : null,
    );

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(1, repeatedCandidate);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(2, uniqueAncestor);
  });

  it("does not replace a generic control with a semantic ancestor", () => {
    const semanticAncestor = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isSelectorTarget: true,
    });
    const genericControl = createSelectorTargetTestElement({
      isSelectorTarget: true,
      parentElement: semanticAncestor,
    });
    vi.mocked(createSemanticElementSelectorDetails).mockReturnValue(null);

    expect(createNearestSemanticElementSelectorDetails(genericControl)).toBe(null);
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledOnce();
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledWith(genericControl);
  });
});
