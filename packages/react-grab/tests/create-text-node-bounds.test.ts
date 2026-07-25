import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createTextNodeBounds,
  invalidateTextNodeBoundsCache,
  setTextNodeBoundsRectIndex,
} from "../src/utils/create-text-node-bounds.js";
import { convertClientPositionToTopWindow } from "../src/utils/convert-client-position-to-top-window.js";

vi.mock("../src/utils/convert-client-position-to-top-window.js", () => ({
  convertClientPositionToTopWindow: vi.fn(),
}));

const createRect = (x: number): DOMRect => {
  const rect: DOMRect = Object.create(null);
  Object.assign(rect, {
    height: 20,
    left: x,
    top: 40,
    width: 80,
  });
  return rect;
};

beforeEach(() => {
  invalidateTextNodeBoundsCache();
  vi.resetAllMocks();
  vi.mocked(convertClientPositionToTopWindow).mockImplementation(
    (_ownerWindow, clientX, clientY) => ({
      scaleX: 1,
      scaleY: 1,
      x: clientX,
      y: clientY,
    }),
  );
});

describe("create text node bounds", () => {
  it("preserves the original wrapped-line position across repeated reflows", () => {
    let rects = [createRect(10), createRect(20)];
    const range: Range = Object.create(null);
    Object.assign(range, {
      getBoundingClientRect: () => rects[0],
      getClientRects: () => rects,
      selectNodeContents: vi.fn(),
    });
    const ownerDocument: Document = Object.create(null);
    Object.assign(ownerDocument, {
      createRange: () => range,
      defaultView: null,
    });
    const textNode: Text = Object.create(null);
    Object.defineProperty(textNode, "ownerDocument", { value: ownerDocument });

    setTextNodeBoundsRectIndex(textNode, 1, 4);
    expect(createTextNodeBounds(textNode).x).toBe(10);

    invalidateTextNodeBoundsCache();
    rects = [createRect(10), createRect(20), createRect(30), createRect(40)];
    expect(createTextNodeBounds(textNode).x).toBe(20);
  });
});
