import { describe, expect, it } from "vitest";
import {
  MODIFIER_MAP,
  parseActivationKeyString,
  normalizeActivationKey,
} from "../src/utils/parse-activation-key.js";

describe("MODIFIER_MAP", () => {
  it("should map win and windows to metaKey", () => {
    expect(MODIFIER_MAP.win).toBe("metaKey");
    expect(MODIFIER_MAP.windows).toBe("metaKey");
  });

  it("should map cmd and command to metaKey", () => {
    expect(MODIFIER_MAP.cmd).toBe("metaKey");
    expect(MODIFIER_MAP.command).toBe("metaKey");
  });

  it("should map meta and super to metaKey", () => {
    expect(MODIFIER_MAP.meta).toBe("metaKey");
    expect(MODIFIER_MAP.super).toBe("metaKey");
  });

  it("should map ctrl and control to ctrlKey", () => {
    expect(MODIFIER_MAP.ctrl).toBe("ctrlKey");
    expect(MODIFIER_MAP.control).toBe("ctrlKey");
  });

  it("should map shift to shiftKey", () => {
    expect(MODIFIER_MAP.shift).toBe("shiftKey");
  });

  it("should map alt to altKey", () => {
    expect(MODIFIER_MAP.alt).toBe("altKey");
  });

  it("should map opt and option to altKey", () => {
    expect(MODIFIER_MAP.opt).toBe("altKey");
    expect(MODIFIER_MAP.option).toBe("altKey");
  });
});

describe("parseActivationKeyString", () => {
  it("should parse Win+K correctly", () => {
    const result = parseActivationKeyString("Win+K");
    expect(result).toEqual({ metaKey: true, key: "k" });
  });

  it("should parse Windows+G correctly", () => {
    const result = parseActivationKeyString("Windows+G");
    expect(result).toEqual({ metaKey: true, key: "g" });
  });

  it("should parse Cmd+Shift+G correctly", () => {
    const result = parseActivationKeyString("Cmd+Shift+G");
    expect(result).toEqual({ metaKey: true, shiftKey: true, key: "g" });
  });

  it("should parse Opt+K correctly", () => {
    const result = parseActivationKeyString("Opt+K");
    expect(result).toEqual({ altKey: true, key: "k" });
  });

  it("should parse Option+C correctly", () => {
    const result = parseActivationKeyString("Option+C");
    expect(result).toEqual({ altKey: true, key: "c" });
  });

  it("should parse Ctrl+C correctly", () => {
    const result = parseActivationKeyString("Ctrl+C");
    expect(result).toEqual({ ctrlKey: true, key: "c" });
  });

  it("should parse Control+Alt+Delete correctly", () => {
    const result = parseActivationKeyString("Control+Alt+Delete");
    expect(result).toEqual({ ctrlKey: true, altKey: true, key: "delete" });
  });

  it("should parse modifier-only combinations like Opt+Alt", () => {
    const result = parseActivationKeyString("Opt+Alt");
    // Both opt and alt map to altKey, so the result should just have altKey
    expect(result).toEqual({ altKey: true });
  });

  it("should be case-insensitive", () => {
    const result1 = parseActivationKeyString("WIN+K");
    const result2 = parseActivationKeyString("win+k");
    const result3 = parseActivationKeyString("Win+k");
    expect(result1).toEqual({ metaKey: true, key: "k" });
    expect(result2).toEqual({ metaKey: true, key: "k" });
    expect(result3).toEqual({ metaKey: true, key: "k" });
  });

  it("should handle spaces around plus signs", () => {
    const result = parseActivationKeyString("Win + K");
    expect(result).toEqual({ metaKey: true, key: "k" });
  });

  it("should return null for empty string", () => {
    expect(parseActivationKeyString("")).toBe(null);
  });

  it("should return null for null input", () => {
    expect(parseActivationKeyString(null as unknown as string)).toBe(null);
  });

  it("should return null for undefined input", () => {
    expect(parseActivationKeyString(undefined as unknown as string)).toBe(null);
  });

  it("should parse Super+Space correctly", () => {
    const result = parseActivationKeyString("Super+Space");
    expect(result).toEqual({ metaKey: true, key: "space" });
  });

  it("should handle multiple modifiers", () => {
    const result = parseActivationKeyString("Ctrl+Shift+Alt+K");
    expect(result).toEqual({
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: "k",
    });
  });

  it("should handle all four modifiers with a key", () => {
    const result = parseActivationKeyString("Cmd+Ctrl+Shift+Alt+K");
    expect(result).toEqual({
      metaKey: true,
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: "k",
    });
  });

  it("should only use the first non-modifier as the key", () => {
    const result = parseActivationKeyString("Ctrl+A+B");
    expect(result).toEqual({ ctrlKey: true, key: "a" });
  });
});

describe("normalizeActivationKey", () => {
  it("should parse string input", () => {
    const result = normalizeActivationKey("Win+K");
    expect(result).toEqual({ metaKey: true, key: "k" });
  });

  it("should return object input as-is if valid", () => {
    const input = { metaKey: true, key: "k" };
    const result = normalizeActivationKey(input);
    expect(result).toEqual(input);
  });

  it("should return object input with just modifier", () => {
    const input = { altKey: true };
    const result = normalizeActivationKey(input);
    expect(result).toEqual(input);
  });

  it("should return object input with just key", () => {
    const input = { key: "k" };
    const result = normalizeActivationKey(input);
    expect(result).toEqual(input);
  });

  it("should return null for empty object", () => {
    const result = normalizeActivationKey({});
    expect(result).toBe(null);
  });

  it("should return null for null input", () => {
    expect(normalizeActivationKey(null)).toBe(null);
  });

  it("should return null for undefined input", () => {
    expect(normalizeActivationKey(undefined)).toBe(null);
  });

  it("should return null for empty string", () => {
    expect(normalizeActivationKey("")).toBe(null);
  });
});
