import { afterEach, describe, expect, it } from "vite-plus/test";
import { registerElementAdapter } from "../src/core/element-adapter.js";
import { isWithinScope, setScopeContainer } from "../src/utils/runtime-mode.js";

const createElement = (parentElement: Element | null = null): HTMLElement =>
  Object.assign(Object.create(null), {
    assignedSlot: null,
    getRootNode: () => null,
    parentElement,
  });

afterEach(() => setScopeContainer(null));

describe("runtime scope", () => {
  it("uses an adapted element's host when checking scope", () => {
    const scopeContainer = createElement();
    const canvasElement = createElement(scopeContainer);
    const syntheticElement = createElement();
    registerElementAdapter(syntheticElement, {
      getBounds: () => ({ borderRadius: "0px", height: 1, width: 1, x: 0, y: 0 }),
      getFiber: () => null,
      getPreview: () => "",
      getSelector: () => "",
      getTagName: () => "mesh",
      hostElement: canvasElement,
      isConnected: () => true,
      supportsDomEditing: false,
    });
    setScopeContainer(scopeContainer);

    expect(isWithinScope(syntheticElement)).toBe(true);
  });
});
