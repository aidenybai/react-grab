import { describe, expect, it } from "vite-plus/test";
import { LIST_ITEM_KEY_MAX_LENGTH_CHARS } from "../src/constants.js";
import { formatListItemKey } from "../src/utils/format-list-item-key.js";

describe("formatListItemKey", () => {
  it("escapes quotes and line breaks", () => {
    expect(formatListItemKey('item:"two"\nnext')).toBe('"item:\\"two\\"\\nnext"');
  });

  it("bounds long keys", () => {
    const formattedKey = formatListItemKey("x".repeat(LIST_ITEM_KEY_MAX_LENGTH_CHARS + 1));

    expect(JSON.parse(formattedKey)).toBe(`${"x".repeat(LIST_ITEM_KEY_MAX_LENGTH_CHARS)}...`);
  });
});
