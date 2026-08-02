import { describe, expect, it } from "vite-plus/test";
import { deleteCacheEntryIfCurrent } from "../src/utils/delete-cache-entry-if-current.js";

describe("deleteCacheEntryIfCurrent", () => {
  it("deletes the current cache entry", () => {
    const cacheKey = {};
    const cacheEntry = {};
    const cache = new WeakMap([[cacheKey, cacheEntry]]);

    deleteCacheEntryIfCurrent(cache, cacheKey, cacheEntry);

    expect(cache.has(cacheKey)).toBe(false);
  });

  it("preserves a newer cache entry when an older request completes", () => {
    const cacheKey = {};
    const olderCacheEntry = {};
    const newerCacheEntry = {};
    const cache = new WeakMap([[cacheKey, newerCacheEntry]]);

    deleteCacheEntryIfCurrent(cache, cacheKey, olderCacheEntry);

    expect(cache.get(cacheKey)).toBe(newerCacheEntry);
  });
});
