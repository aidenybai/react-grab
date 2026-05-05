import { describe, expect, it } from "vite-plus/test";
import {
  isInternalComponentName,
  isUsefulComponentName,
} from "../src/utils/is-useful-component-name.js";

describe("isUsefulComponentName", () => {
  it("accepts user component names", () => {
    expect(isUsefulComponentName("LoginForm")).toBe(true);
    expect(isUsefulComponentName("TodoItem")).toBe(true);
  });

  it("rejects empty names", () => {
    expect(isUsefulComponentName("")).toBe(false);
  });

  it("rejects React internals", () => {
    expect(isUsefulComponentName("Suspense")).toBe(false);
    expect(isUsefulComponentName("Fragment")).toBe(false);
  });

  it("rejects Next.js App Router internals", () => {
    expect(isUsefulComponentName("InnerLayoutRouter")).toBe(false);
    expect(isUsefulComponentName("AppRouter")).toBe(false);
  });

  it("rejects framework-prefixed component names", () => {
    expect(isUsefulComponentName("motion.div")).toBe(false);
    expect(isUsefulComponentName("styled.button")).toBe(false);
    expect(isUsefulComponentName("_internal")).toBe(false);
    expect(isUsefulComponentName("$Provider")).toBe(false);
  });

  it("rejects Slot/SlotClone (Radix internals)", () => {
    expect(isUsefulComponentName("Slot")).toBe(false);
    expect(isUsefulComponentName("SlotClone")).toBe(false);
  });
});

describe("isInternalComponentName", () => {
  it("flags React and Next.js internals", () => {
    expect(isInternalComponentName("Suspense")).toBe(true);
    expect(isInternalComponentName("AppRouter")).toBe(true);
  });

  it("does not flag user components", () => {
    expect(isInternalComponentName("LoginForm")).toBe(false);
  });
});
