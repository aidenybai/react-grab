// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vite-plus/test";
import { createWebHostTargetAdapter } from "../src/web-target-adapter.js";

describe("web host target adapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
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
