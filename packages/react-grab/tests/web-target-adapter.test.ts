// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { resolveLiveElement } from "../src/core/element-anchors.js";
import { getElementAtPoint } from "../src/primitives.js";
import { createWebHostTargetAdapter } from "../src/web-target-adapter.js";

vi.mock("../src/core/element-anchors.js", () => ({
  resolveLiveElement: vi.fn((element: Element) => element),
  trackElementAnchor: vi.fn(),
}));

vi.mock("../src/primitives.js", () => ({
  getElementAtPoint: vi.fn(),
}));

describe("web host target adapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.mocked(getElementAtPoint).mockReturnValue(null);
    vi.mocked(resolveLiveElement).mockImplementation((element) => element);
  });

  it("keeps target identity separate from its live DOM element", async () => {
    const adapter = createWebHostTargetAdapter();
    const element = document.createElement("button");
    element.setAttribute("aria-label", "Save");
    element.setAttribute("data-testid", "save-button");
    document.body.appendChild(element);

    const target = adapter.getTarget(element);

    expect(adapter.getTarget(element)).toBe(target);
    expect(adapter.getElement(target)).toBe(element);
    expect(await target.capabilities.resolve()).toBe(target);
    await expect(target.capabilities.describe()).resolves.toEqual({
      name: "button",
      role: null,
      label: "Save",
      testId: "save-button",
    });
  });

  it("uses a live replacement for every target capability", async () => {
    const adapter = createWebHostTargetAdapter();
    const initialElement = document.createElement("button");
    initialElement.setAttribute("data-testid", "initial");
    document.body.appendChild(initialElement);
    const target = adapter.getTarget(initialElement);
    const replacementElement = document.createElement("section");
    replacementElement.setAttribute("data-testid", "replacement");

    initialElement.replaceWith(replacementElement);
    vi.mocked(resolveLiveElement).mockImplementation((element) =>
      element === initialElement ? replacementElement : element,
    );

    await expect(target.capabilities.measure()).resolves.not.toBeNull();
    await expect(target.capabilities.describe()).resolves.toMatchObject({
      name: "section",
      testId: "replacement",
    });
    expect(adapter.getElement(target)).toBe(replacementElement);
    expect(adapter.getTarget(replacementElement)).toBe(target);
  });

  it("exposes hierarchy without leaking elements through the target contract", async () => {
    const adapter = createWebHostTargetAdapter();
    const parentElement = document.createElement("section");
    const childElement = document.createElement("button");
    parentElement.appendChild(childElement);
    document.body.appendChild(parentElement);

    const parentTarget = adapter.getTarget(parentElement);
    const childTarget = adapter.getTarget(childElement);

    await expect(childTarget.capabilities.getParent?.()).resolves.toBe(parentTarget);
    await expect(parentTarget.capabilities.getChildren?.()).resolves.toEqual([childTarget]);
  });

  it("includes light and shadow children in target hierarchy", async () => {
    const adapter = createWebHostTargetAdapter();
    const hostElement = document.createElement("section");
    const lightChildElement = document.createElement("button");
    const shadowChildElement = document.createElement("input");
    hostElement.appendChild(lightChildElement);
    hostElement.attachShadow({ mode: "open" }).appendChild(shadowChildElement);
    document.body.appendChild(hostElement);

    const hostTarget = adapter.getTarget(hostElement);
    const lightChildTarget = adapter.getTarget(lightChildElement);
    const shadowChildTarget = adapter.getTarget(shadowChildElement);

    await expect(hostTarget.capabilities.getChildren?.()).resolves.toEqual([
      lightChildTarget,
      shadowChildTarget,
    ]);
    await expect(shadowChildTarget.capabilities.getParent?.()).resolves.toBe(hostTarget);
  });

  it("shares primitive hit testing behavior", async () => {
    const adapter = createWebHostTargetAdapter();
    const element = document.createElement("canvas");
    vi.mocked(getElementAtPoint).mockReturnValue(element);

    const target = await adapter.getTargetAtPoint({ x: 10, y: 20 });

    expect(getElementAtPoint).toHaveBeenCalledWith(10, 20);
    expect(target).toBe(adapter.getTarget(element));
  });

  it("invalidates disconnected targets without requiring React metadata", async () => {
    const adapter = createWebHostTargetAdapter();
    const element = document.createElement("div");
    document.body.appendChild(element);
    const target = adapter.getTarget(element);

    element.remove();

    await expect(target.capabilities.resolve()).resolves.toBeNull();
    expect(target.capabilities.getReactMetadata).toBeUndefined();
  });
});
