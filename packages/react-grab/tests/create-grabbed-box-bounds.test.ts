import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createGrabbedBoxBounds } from "../src/utils/create-grabbed-box-bounds.js";
import { createElementBounds } from "../src/utils/create-element-bounds.js";
import { createTextNodeBounds } from "../src/utils/create-text-node-bounds.js";
import { isElementConnected } from "../src/utils/is-element-connected.js";

vi.mock("../src/utils/create-element-bounds.js", () => ({
  createElementBounds: vi.fn(),
}));

vi.mock("../src/utils/create-text-node-bounds.js", () => ({
  createTextNodeBounds: vi.fn(),
}));

vi.mock("../src/utils/is-element-connected.js", () => ({
  isElementConnected: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("create grabbed box bounds", () => {
  it("keeps stored text bounds while the text node is disconnected", () => {
    const element: Element = Object.create(null);
    const textNode: Text = Object.create(null);
    Object.defineProperty(textNode, "isConnected", { value: false });
    const bounds = {
      borderRadius: "0px",
      height: 20,
      width: 120,
      x: 30,
      y: 40,
    };
    vi.mocked(isElementConnected).mockReturnValue(true);

    expect(
      createGrabbedBoxBounds({
        bounds,
        createdAt: 0,
        element,
        id: "text-box",
        textNode,
      }),
    ).toBe(bounds);
    expect(createTextNodeBounds).not.toHaveBeenCalled();
    expect(createElementBounds).not.toHaveBeenCalled();
  });
});
