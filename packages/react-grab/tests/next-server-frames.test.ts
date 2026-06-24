import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { StackFrame } from "bippy/source";
import { symbolicateServerFrames } from "../src/core/next-server-frames.js";

// symbolicateServerFrames touches only `document` (for the Next base path) and
// the global `fetch`, both stubbed here so the POST behavior can be asserted in
// node without a browser.
type FetchStub = (url: string, init: RequestInit) => Promise<Response>;

const makeServerFrame = (): StackFrame =>
  ({
    functionName: "ServerComponent",
    fileName: "rsc://React/Server/webpack-internal:///./app/page.tsx?2",
    lineNumber: 10,
    columnNumber: 5,
    isServer: true,
  }) as StackFrame;

const makeClientFrame = (): StackFrame =>
  ({
    functionName: "ClientComponent",
    fileName: "/src/app/widget.tsx",
    lineNumber: 3,
    columnNumber: 1,
    isServer: false,
  }) as StackFrame;

let originalFetch: typeof globalThis.fetch;
const globalWithDocument = globalThis as { document?: unknown };
let originalDocument: unknown;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalDocument = globalWithDocument.document;
  // getNextBasePath reads document.querySelector; null keeps the base path empty.
  globalWithDocument.document = { querySelector: () => null };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalWithDocument.document = originalDocument;
});

describe("symbolicateServerFrames", () => {
  it("issues no request and returns the frames untouched when none are server frames", async () => {
    let didFetch = false;
    globalThis.fetch = (() => {
      didFetch = true;
      return Promise.reject(new Error("should not fetch"));
    }) as FetchStub as typeof globalThis.fetch;

    const frames = [makeClientFrame()];
    expect(await symbolicateServerFrames(frames)).toBe(frames);
    expect(didFetch).toBe(false);
  });

  // A fetch stub that rejects when its signal aborts, mirroring real fetch
  // (including an immediate reject when the signal is already aborted).
  const abortableFetch = (onCall: (signal: AbortSignal | undefined) => void): FetchStub => {
    return (_url, init) => {
      onCall(init.signal ?? undefined);
      return new Promise<Response>((_resolve, reject) => {
        const abortError = new DOMException("Aborted", "AbortError");
        if (init.signal?.aborted) {
          reject(abortError);
          return;
        }
        init.signal?.addEventListener("abort", () => reject(abortError));
      });
    };
  };

  it("aborts the in-flight POST when the external signal fires (no orphaned request)", async () => {
    let requestSignal: AbortSignal | undefined;
    globalThis.fetch = abortableFetch((signal) => {
      requestSignal = signal;
    }) as typeof globalThis.fetch;

    const queueController = new AbortController();
    const frames = [makeServerFrame()];
    const resultPromise = symbolicateServerFrames(frames, queueController.signal);

    // The source-fetch queue times out and aborts; the POST must die with it.
    queueController.abort();
    const result = await resultPromise;

    expect(requestSignal?.aborted).toBe(true);
    expect(result).toEqual(frames);
  });

  it("degrades immediately when the external signal is already aborted", async () => {
    globalThis.fetch = abortableFetch(() => {}) as typeof globalThis.fetch;

    // An already-aborted signal must not hang; the original frames come back.
    const result = await symbolicateServerFrames([makeServerFrame()], AbortSignal.abort());
    expect(result).toEqual([makeServerFrame()]);
  });

  it("returns the original frames when the endpoint responds with an error", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response("error", { status: 500 }))) as FetchStub as typeof globalThis.fetch;

    const frames = [makeServerFrame()];
    expect(await symbolicateServerFrames(frames)).toEqual(frames);
  });
});
