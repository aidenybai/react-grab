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
  element.matches = (selector: string) =>
    Boolean(
      options.hasSelectorIdentifier ||
      (options.isSelectorTarget && selector.split(",").includes("button")),
    );
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

  it("uses an adapter selector from the selected element", () => {
    const selectedElement = createSelectorTargetTestElement();
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: 'mesh[name="left-cube"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockReturnValue(expectedSelectorDetails);

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledOnce();
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledWith(selectedElement);
  });

  it("evaluates preferred alt selector candidates", () => {
    const selectedElement = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
    });
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

  it("skips a non-interactive role in favor of an actionable semantic ancestor", () => {
    const semanticAncestor = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
    });
    const nonInteractiveRole = createSelectorTargetTestElement({
      parentElement: semanticAncestor,
    });
    const selectedElement = createSelectorTargetTestElement({
      parentElement: nonInteractiveRole,
    });
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: '[aria-label="Source-less icon link"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockImplementation((candidate) =>
      candidate === nonInteractiveRole
        ? {
            selector: '[role="img"]',
            isSemantic: true,
          }
        : candidate === semanticAncestor
          ? expectedSelectorDetails
          : null,
    );

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
    expect(createSemanticElementSelectorDetails).toHaveBeenCalledTimes(2);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(1, selectedElement);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(2, semanticAncestor);
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
