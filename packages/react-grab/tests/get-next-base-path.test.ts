import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const globalWithDocument = globalThis as { document?: unknown };
let originalDocument: unknown;

const stubScriptSource = (source: string | null): void => {
  globalWithDocument.document = {
    querySelector: () => (source === null ? null : { src: source }),
  };
};

// getNextBasePath memoizes at module scope with no reset hook, so each branch
// needs a freshly imported module to act as its "first call".
const loadGetNextBasePath = async (): Promise<() => string> => {
  vi.resetModules();
  return (await import("../src/utils/get-next-base-path.js")).getNextBasePath;
};

beforeEach(() => {
  originalDocument = globalWithDocument.document;
});

afterEach(() => {
  globalWithDocument.document = originalDocument;
  vi.resetModules();
});

describe("getNextBasePath", () => {
  it("returns the prefix before /_next/ when a basePath is configured", async () => {
    stubScriptSource("http://localhost:3000/app/_next/static/chunks/main.js");
    const getNextBasePath = await loadGetNextBasePath();
    expect(getNextBasePath()).toBe("/app");
  });

  it("returns an empty string when scripts load from the root /_next/", async () => {
    stubScriptSource("http://localhost:3000/_next/static/chunks/main.js");
    const getNextBasePath = await loadGetNextBasePath();
    expect(getNextBasePath()).toBe("");
  });

  it("returns an empty string when no /_next/ script is present", async () => {
    stubScriptSource(null);
    const getNextBasePath = await loadGetNextBasePath();
    expect(getNextBasePath()).toBe("");
  });

  it("memoizes the first computed base path", async () => {
    stubScriptSource("http://localhost:3000/app/_next/static/chunks/main.js");
    const getNextBasePath = await loadGetNextBasePath();
    expect(getNextBasePath()).toBe("/app");

    stubScriptSource("http://localhost:3000/other/_next/static/chunks/main.js");
    expect(getNextBasePath()).toBe("/app");
  });
});
