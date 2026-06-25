import { describe, expect, it } from "vite-plus/test";
import { isKeyOverriddenBySpread } from "../src/utils/is-key-overridden-by-spread.js";

describe("isKeyOverriddenBySpread", () => {
  it("trusts an explicit key with no spread", () => {
    expect(isKeyOverriddenBySpread('<div key={item.id} className="card">')).toBe(false);
  });

  it("trusts an explicit key when the spread comes before it", () => {
    expect(isKeyOverriddenBySpread("<div {...props} key={item.id}>")).toBe(false);
  });

  it("flags a spread that follows the key (the spread can override it)", () => {
    expect(isKeyOverriddenBySpread("<div key={item.id} {...item}>")).toBe(true);
  });

  it("flags a key sourced entirely from a spread", () => {
    expect(isKeyOverriddenBySpread("<Item {...item} />")).toBe(true);
  });

  it("trusts a key followed only by ordinary attributes", () => {
    expect(isKeyOverriddenBySpread('<li key={i} className="row" data-testid="x">')).toBe(false);
  });

  it("flags a key with a trailing spread even when other attributes sit between", () => {
    expect(isKeyOverriddenBySpread('<li key={i} className="row" {...rest} />')).toBe(true);
  });

  it("ignores a `key` that only appears inside an attribute expression", () => {
    expect(isKeyOverriddenBySpread("<div data-meta={{ key: 1 }} {...props}>")).toBe(true);
    expect(isKeyOverriddenBySpread("<div data-meta={{ key: 1 }}>")).toBe(false);
  });

  it("ignores a spread nested inside an attribute expression", () => {
    expect(isKeyOverriddenBySpread("<div key={i} style={merge({ ...base })}>")).toBe(false);
  });

  it("ignores braces and tag characters inside string attribute values", () => {
    expect(isKeyOverriddenBySpread('<div title="a > b {...c}" key={i}>')).toBe(false);
  });

  it("handles a key attribute that spans multiple lines before the spread", () => {
    const source = `<div\n  key={item.id}\n  className="card"\n  {...item}\n>`;
    expect(isKeyOverriddenBySpread(source)).toBe(true);
  });

  it("returns false when the tag cannot be delimited", () => {
    expect(isKeyOverriddenBySpread("not jsx at all")).toBe(false);
    expect(isKeyOverriddenBySpread("<div key={i}")).toBe(false);
  });

  it("does not treat an identifier ending in `key` as the key attribute", () => {
    expect(isKeyOverriddenBySpread("<div datakey={i} {...props}>")).toBe(true);
    expect(isKeyOverriddenBySpread("<div keyboard={i}>")).toBe(false);
  });
});
