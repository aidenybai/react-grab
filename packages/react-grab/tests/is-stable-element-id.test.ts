import { describe, expect, it } from "vite-plus/test";
import { isStableElementId } from "../src/utils/is-stable-element-id.js";

describe("isStableElementId", () => {
  it("accepts authored identifiers", () => {
    expect(isStableElementId("checkout-submit")).toBe(true);
    expect(isStableElementId("user-123-profile")).toBe(true);
    expect(isStableElementId("header-r-content")).toBe(true);
    expect(isStableElementId("menu_r_item")).toBe(true);
    expect(isStableElementId("headlessui-navigation")).toBe(true);
    expect(isStableElementId("mui-dialog")).toBe(true);
    expect(isStableElementId("radix-settings")).toBe(true);
    expect(isStableElementId("react-aria-calendar")).toBe(true);
    expect(isStableElementId("settings:account")).toBe(true);
    expect(isStableElementId("namespace:item:label")).toBe(true);
  });

  it("rejects React-generated identifiers", () => {
    expect(isStableElementId(":r0:")).toBe(false);
    expect(isStableElementId("radix-:r1:")).toBe(false);
    expect(isStableElementId("_r_0_")).toBe(false);
    expect(isStableElementId("menu-_r_12_")).toBe(false);
    expect(isStableElementId("checkout_r_0_")).toBe(false);
    expect(isStableElementId("react-grab_r_12_")).toBe(false);
    expect(isStableElementId("«r0»")).toBe(false);
    expect(isStableElementId("radix-«r12»")).toBe(false);
  });

  it("rejects framework-generated identifiers", () => {
    expect(isStableElementId("downshift-2-input")).toBe(false);
    expect(isStableElementId("headlessui-menu-button-7")).toBe(false);
    expect(isStableElementId("mui-12")).toBe(false);
    expect(isStableElementId("radix-3")).toBe(false);
    expect(isStableElementId("react-aria-4-option")).toBe(false);
    expect(isStableElementId("react-select-2-input")).toBe(false);
    expect(isStableElementId("ember123")).toBe(false);
  });

  it("rejects UUID, numeric, and oversized identifiers", () => {
    expect(isStableElementId("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(isStableElementId("00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isStableElementId("123456")).toBe(false);
    expect(isStableElementId("a".repeat(121))).toBe(false);
  });
});
