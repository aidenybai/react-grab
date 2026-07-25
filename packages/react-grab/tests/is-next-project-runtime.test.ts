import { afterEach, describe, expect, it } from "vite-plus/test";
import { isNextProjectRuntime } from "../src/utils/is-next-project-runtime.js";

const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

const setDocumentMarkers = (
  nextDataElement: object | null,
  matchingSelector: string | null,
): void => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: () => nextDataElement,
      querySelector: (selector: string) => (selector === matchingSelector ? {} : null),
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
    setDocumentMarkers({}, null);

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("detects Next development and App Router production markers", () => {
    setDocumentMarkers(null, 'nextjs-portal, script[src*="/_next/"]');

    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("rejects documents without Next markers", () => {
    setDocumentMarkers(null, null);

    expect(isNextProjectRuntime(true)).toBe(false);
  });
});
