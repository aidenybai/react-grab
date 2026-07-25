import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createGrabStore } from "../src/core/store.js";
import { resolveLiveElement, trackElementAnchor } from "../src/core/element-anchors.js";
import { resolveLiveTextNode, trackTextNodeAnchor } from "../src/core/text-node-anchors.js";

vi.mock("../src/core/element-anchors.js", () => ({
  resolveLiveElement: vi.fn(),
  trackElementAnchor: vi.fn(),
}));

vi.mock("../src/core/text-node-anchors.js", () => ({
  resolveLiveTextNode: vi.fn(),
  trackTextNodeAnchor: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("store text node anchors", () => {
  it("tracks text nodes added to feedback collections", () => {
    const element: Element = Object.create(null);
    const textNode: Text = Object.create(null);
    const bounds = {
      borderRadius: "0px",
      height: 20,
      width: 120,
      x: 30,
      y: 40,
    };
    const { actions } = createGrabStore({ keyHoldDuration: 100 });

    actions.addGrabbedBox({
      bounds,
      createdAt: 0,
      element,
      id: "text-box",
      textNode,
    });
    actions.addLabelInstance({
      bounds,
      createdAt: 0,
      element,
      id: "text-label",
      status: "copied",
      tagName: "#text",
      textNode,
    });

    expect(trackElementAnchor).toHaveBeenCalledTimes(2);
    expect(trackTextNodeAnchor).toHaveBeenCalledTimes(2);
    expect(trackTextNodeAnchor).toHaveBeenNthCalledWith(1, textNode);
    expect(trackTextNodeAnchor).toHaveBeenNthCalledWith(2, textNode);
  });

  it("keeps text targets when a relink attempt temporarily fails", () => {
    const element: Element = Object.create(null);
    const textNode: Text = Object.create(null);
    const bounds = {
      borderRadius: "0px",
      height: 20,
      width: 120,
      x: 30,
      y: 40,
    };
    vi.mocked(resolveLiveElement).mockReturnValue(element);
    vi.mocked(resolveLiveTextNode).mockReturnValue(null);
    const { actions, store } = createGrabStore({ keyHoldDuration: 100 });

    actions.addGrabbedBox({
      bounds,
      createdAt: 0,
      element,
      id: "text-box",
      textNode,
    });
    actions.addLabelInstance({
      bounds,
      createdAt: 0,
      element,
      id: "text-label",
      status: "copied",
      tagName: "#text",
      textNode,
    });
    actions.relinkLiveElements();

    expect(store.grabbedBoxes[0]?.textNode).toBe(textNode);
    expect(store.labelInstances[0]?.textNode).toBe(textNode);
  });
});
