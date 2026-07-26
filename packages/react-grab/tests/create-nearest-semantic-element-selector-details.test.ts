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
  isBroadSelectorTarget?: boolean;
  isSelectorTarget?: boolean;
  parentElement?: Element | null;
}

const createSelectorTargetTestElement = (
  options: SelectorTargetTestElementOptions = {},
): Element => {
  const element = Object.create(null);
  element.getAttribute = () => null;
  element.hasAttribute = () => Boolean(options.hasSelectorIdentifier);
  element.matches = (selector: string) =>
    Boolean(options.isSelectorTarget && selector.split(",").includes("button"));
  element.getElementsByTagName = () => (options.isBroadSelectorTarget ? [element] : []);
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
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(1, selectedElement);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(2, repeatedCandidate);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(3, uniqueAncestor);
  });

  it("evaluates preferred selector attributes outside the selector target query", () => {
    const selectedElement = createSelectorTargetTestElement();
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: '[alt="Account avatar"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockReturnValue(expectedSelectorDetails);

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledOnce();
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledWith(selectedElement);
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

  it("does not replace a selected descendant with a broad semantic ancestor", () => {
    const broadSemanticAncestor = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isBroadSelectorTarget: true,
    });
    const selectedElement = createSelectorTargetTestElement({
      parentElement: broadSemanticAncestor,
    });
    vi.mocked(createSemanticElementSelectorDetails).mockImplementation((candidate) =>
      candidate === broadSemanticAncestor
        ? {
            selector: '[title="Application shell"]',
            isSemantic: true,
          }
        : null,
    );

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(null);
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledOnce();
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledWith(selectedElement);
  });
});
