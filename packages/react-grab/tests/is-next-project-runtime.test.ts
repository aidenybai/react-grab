import { afterEach, describe, expect, it } from "vite-plus/test";
import { isNextProjectRuntime } from "../src/utils/is-next-project-runtime.js";

const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

const setDocumentMarkers = (
  nextDataElement: object | null,
  hasNextPortal: boolean,
  scriptSources: string[] = [],
  inlineScriptContents: string[] = [],
): void => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      baseURI: "https://example.com/products",
      getElementById: () => nextDataElement,
      querySelector: (selector: string) =>
        selector === "nextjs-portal" && hasNextPortal ? {} : null,
      scripts: [
        ...scriptSources.map((src) => ({ src, textContent: "" })),
        ...inlineScriptContents.map((textContent) => ({ src: "", textContent })),
      ],
    },
  });
};

afterEach(() => {
  if (originalDocumentDescriptor) {
    Object.defineProperty(globalThis, "document", originalDocumentDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "document");
  }
  isNextProjectRuntime(true);
});

describe("isNextProjectRuntime", () => {
  it("detects the Pages Router marker", () => {
    setDocumentMarkers({}, false);

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("detects the Next development portal", () => {
    setDocumentMarkers(null, true);

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("detects a same-origin App Router production asset", () => {
    setDocumentMarkers(null, false, ["/products/_next/static/chunks/app/page.js"]);

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("detects App Router flight data when assets use a CDN", () => {
    setDocumentMarkers(
      null,
      false,
      ["https://cdn.example.net/_next/static/chunks/app/page.js"],
      ['self.__next_f.push([1, "app-router-payload"])'],
    );

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("rejects flight bootstrap text without a Next asset", () => {
    setDocumentMarkers(
      null,
      false,
      [],
      ['const example = "self.__next_f.push([1, \\"app-router-payload\\"])";'],
    );

    expect(isNextProjectRuntime(true)).toBe(false);
  });

  it("rejects unrelated and cross-origin script paths containing _next", () => {
    setDocumentMarkers(null, false, [
      "/vendor/_next/plugin.js",
      "https://cdn.example.net/_next/static/chunks/widget.js",
    ]);

    expect(isNextProjectRuntime(true)).toBe(false);
  });

  it("ignores malformed script URLs", () => {
    setDocumentMarkers(null, false, ["http://[::1"]);

    expect(isNextProjectRuntime(true)).toBe(false);
  });

  it("rejects documents without Next markers", () => {
    setDocumentMarkers(null, false);

    expect(isNextProjectRuntime(true)).toBe(false);
  });
});
