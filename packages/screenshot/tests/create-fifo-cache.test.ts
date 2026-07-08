import { describe, expect, it } from "vite-plus/test";
import { createFifoCache } from "../src/utils/create-fifo-cache";

describe("createFifoCache", () => {
  it("stores and retrieves values", () => {
    const cache = createFifoCache<number>(2);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the oldest entry once capacity is reached", () => {
    const cache = createFifoCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("overwrites an existing key without evicting", () => {
    const cache = createFifoCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10);
    expect(cache.get("a")).toBe(10);
    expect(cache.get("b")).toBe(2);
  });
});
