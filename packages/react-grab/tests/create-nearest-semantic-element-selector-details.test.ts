import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createSemanticElementSelectorDetails,
  type ElementSelectorDetails,
} from "../src/utils/create-element-selector.js";
import { createNearestSemanticElementSelectorDetails } from "../src/utils/create-nearest-semantic-element-selector-details.js";
import { registerElementAdapter } from "../src/core/element-adapter.js";
import { getComposedParentElement } from "../src/utils/get-composed-parent-element.js";
import { findSelectorTarget } from "../src/utils/find-selector-target.js";

vi.mock("../src/utils/create-element-selector.js", () => ({
  createSemanticElementSelectorDetails: vi.fn(),
}));

vi.mock("../src/utils/get-composed-parent-element.js", () => ({
  getComposedParentElement: vi.fn(),
}));

interface SelectorTargetTestElementOptions {
  hasSelectorIdentifier?: boolean;
  isBroadSelectorTarget?: boolean;
  isSelectorTarget?: boolean;
  parentElement?: Element | null;
  role?: string;
  rootNode?: object;
}

const selectorTargetOwnerDocument = {
  body: {
    getElementsByTagName: () => [Object.create(null)],
  },
  documentElement: Object.create(null),
};

const createSelectorTargetTestElement = (
  options: SelectorTargetTestElementOptions = {},
): Element => {
  const element = Object.create(null);
  element.getAttribute = (attributeName: string) =>
    attributeName === "role" ? (options.role ?? null) : null;
  element.matches = (selector: string) =>
    Boolean(
      options.hasSelectorIdentifier ||
      (options.isSelectorTarget && selector.split(",").includes("button")) ||
      (options.role && selector.split(",").includes(`[role="${options.role}"]`)),
    );
  element.getElementsByTagName = () => (options.isBroadSelectorTarget ? [element] : []);
  element.getRootNode = () => options.rootNode ?? selectorTargetOwnerDocument;
  element.parentElement = options.parentElement ?? null;
  element.ownerDocument = selectorTargetOwnerDocument;
  return element;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getComposedParentElement).mockImplementation((element) => element.parentElement);
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

  it("uses an adapter selector from the selected element", () => {
    const selectedElement = createSelectorTargetTestElement();
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: 'mesh[name="left-cube"]',
      isSemantic: true,
    };
    registerElementAdapter(selectedElement, {
      hostElement: selectedElement,
      supportsDomEditing: false,
      getBounds: () => ({
        borderRadius: "0px",
        height: 1,
        width: 1,
        x: 0,
        y: 0,
      }),
      getFiber: () => null,
      getPreview: () => "<mesh />",
      getSelector: () => expectedSelectorDetails.selector,
      getTagName: () => "mesh",
      isConnected: () => true,
    });
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
    const selectedElement = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      parentElement: semanticAncestor,
      role: "img",
    });
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: '[aria-label="Trusted-source icon link"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockImplementation((candidate) =>
      candidate === selectedElement
        ? null
        : candidate === semanticAncestor
          ? expectedSelectorDetails
          : null,
    );

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
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

  it("continues through an intermediate generic control to a semantic ancestor", () => {
    const semanticAncestor = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isSelectorTarget: true,
    });
    const genericControl = createSelectorTargetTestElement({
      isSelectorTarget: true,
      parentElement: semanticAncestor,
    });
    const selectedElement = createSelectorTargetTestElement({
      parentElement: genericControl,
    });
    const expectedSelectorDetails: ElementSelectorDetails = {
      selector: '[data-testid="icon-button-group"]',
      isSemantic: true,
    };
    vi.mocked(createSemanticElementSelectorDetails).mockImplementation((candidate) =>
      candidate === semanticAncestor ? expectedSelectorDetails : null,
    );

    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(
      expectedSelectorDetails,
    );
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(1, genericControl);
    expect(createSemanticElementSelectorDetails).toHaveBeenNthCalledWith(2, semanticAncestor);
  });

  it("does not replace the selected element with a semantic boundary host", () => {
    const semanticHost = createSelectorTargetTestElement({
      hasSelectorIdentifier: true,
      isSelectorTarget: true,
    });
    const selectedElement = createSelectorTargetTestElement({
      rootNode: Object.create(null),
    });
    vi.mocked(getComposedParentElement).mockImplementation((element) =>
      element === selectedElement ? semanticHost : element.parentElement,
    );
    vi.mocked(createSemanticElementSelectorDetails).mockReturnValue(null);

    expect(findSelectorTarget(selectedElement)).toBe(selectedElement);
    expect(createNearestSemanticElementSelectorDetails(selectedElement)).toBe(null);
    expect(createSemanticElementSelectorDetails).not.toHaveBeenCalled();
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
    expect(createSemanticElementSelectorDetails).not.toHaveBeenCalled();
  });
});
