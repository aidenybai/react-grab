import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { isNextProjectRuntime } from "../src/utils/is-next-project-runtime.js";

interface DocumentStub {
  getElementById: (id: string) => unknown;
  querySelector: (selector: string) => unknown;
}

const globalWithDocument = globalThis as { document?: unknown };
let originalDocument: unknown;

const stubDocument = (stub: DocumentStub | undefined): void => {
  globalWithDocument.document = stub;
};

beforeEach(() => {
  originalDocument = globalWithDocument.document;
});

afterEach(() => {
  globalWithDocument.document = originalDocument;
});

describe("isNextProjectRuntime", () => {
  it("is false when there is no document (e.g. server runtime)", () => {
    stubDocument(undefined);
    expect(isNextProjectRuntime(true)).toBe(false);
  });

  it("detects the __NEXT_DATA__ script (Pages Router)", () => {
    stubDocument({
      getElementById: (id) => (id === "__NEXT_DATA__" ? {} : null),
      querySelector: () => null,
    });
    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("detects the nextjs-portal element (App Router dev overlay)", () => {
    stubDocument({
      getElementById: () => null,
      querySelector: (selector) => (selector === "nextjs-portal" ? {} : null),
    });
    expect(isNextProjectRuntime(true)).toBe(true);
  });

  it("is false when neither Next marker is present", () => {
    stubDocument({ getElementById: () => null, querySelector: () => null });
    expect(isNextProjectRuntime(true)).toBe(false);
  });

  it("memoizes the result until revalidation is requested", () => {
    stubDocument({
      getElementById: (id) => (id === "__NEXT_DATA__" ? {} : null),
      querySelector: () => null,
    });
    expect(isNextProjectRuntime(true)).toBe(true);

    // The cached value holds even though the markers are now gone...
    stubDocument({ getElementById: () => null, querySelector: () => null });
    expect(isNextProjectRuntime()).toBe(true);

    // ...until a revalidate pass re-reads the DOM.
    expect(isNextProjectRuntime(true)).toBe(false);
  });
});
