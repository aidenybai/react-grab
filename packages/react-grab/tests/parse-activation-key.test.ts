import { describe, expect, it } from "vite-plus/test";
import {
  getModifiersFromActivationKey,
  parseActivationKey,
} from "../src/utils/parse-activation-key.js";

const makeKeyEvent = (overrides: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  }) as KeyboardEvent;

describe("parseActivationKey", () => {
  it("returns a custom matcher function untouched", () => {
    const custom = (_event: KeyboardEvent): boolean => true;
    expect(parseActivationKey(custom)).toBe(custom);
  });

  it("matches a single key with no modifiers held", () => {
    const matches = parseActivationKey("k");
    expect(matches(makeKeyEvent({ key: "k" }))).toBe(true);
    expect(matches(makeKeyEvent({ key: "a" }))).toBe(false);
    expect(matches(makeKeyEvent({ key: "k", ctrlKey: true }))).toBe(false);
  });

  it("matches via event.code when event.key does not", () => {
    const matches = parseActivationKey("k");
    expect(matches(makeKeyEvent({ key: "Unidentified", code: "KeyK" }))).toBe(true);
  });

  it("requires the configured modifier alongside the key", () => {
    const matches = parseActivationKey("meta+k");
    expect(matches(makeKeyEvent({ key: "k", metaKey: true }))).toBe(true);
    expect(matches(makeKeyEvent({ key: "k" }))).toBe(false);
  });

  it("matches a modifier-only chord while it is held", () => {
    const matches = parseActivationKey("meta+shift");
    expect(matches(makeKeyEvent({ metaKey: true, shiftKey: true }))).toBe(true);
    expect(matches(makeKeyEvent({ metaKey: true }))).toBe(false);
    // The modifier key itself reports through event.key on its own keydown.
    expect(matches(makeKeyEvent({ key: "Shift", metaKey: true, shiftKey: true }))).toBe(true);
  });
});

describe("getModifiersFromActivationKey", () => {
  it("parses an explicit string chord", () => {
    expect(getModifiersFromActivationKey("ctrl+shift+k")).toEqual({
      metaKey: false,
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      key: "k",
    });
  });

  it("falls back to platform defaults for undefined and function keys", () => {
    const forUndefined = getModifiersFromActivationKey(undefined);
    expect(forUndefined.shiftKey).toBe(false);
    expect(forUndefined.altKey).toBe(false);
    expect(forUndefined.key).toBe(null);
    // meta vs ctrl is platform-dependent, but exactly one is the primary chord.
    expect(forUndefined.metaKey).not.toBe(forUndefined.ctrlKey);

    const forFunction = getModifiersFromActivationKey(() => true);
    expect(forFunction).toEqual(forUndefined);
  });
});
