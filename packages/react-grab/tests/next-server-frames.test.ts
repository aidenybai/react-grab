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

interface CapturedRequest {
  url: string;
  body: {
    frames: Array<{ file: string; methodName: string; line1: number | null; column1: number | null }>;
    isServer: boolean;
    isEdgeServer: boolean;
    isAppDirectory: boolean;
  };
}

// A fetch stub that captures the request and replies with the given
// PromiseSettledResult-shaped symbolication results.
const respondWith = (
  results: unknown[],
  capture?: (request: CapturedRequest) => void,
): typeof globalThis.fetch => {
  return ((url: string, init: RequestInit) => {
    capture?.({ url, body: JSON.parse(String(init.body)) });
    return Promise.resolve(
      new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as FetchStub as typeof globalThis.fetch;
};

const fulfilled = (file: string, line1: number, column1: number, ignored = false) => ({
  status: "fulfilled",
  value: { originalStackFrame: { file, line1, column1, ignored } },
});

describe("symbolicateServerFrames — success path", () => {
  it("requests only the server frames, devirtualized, with the Next app-dir flags", async () => {
    let captured: CapturedRequest | undefined;
    globalThis.fetch = respondWith(
      [fulfilled("app/page.tsx", 12, 3)],
      (request) => {
        captured = request;
      },
    );

    const frames = [makeClientFrame(), makeServerFrame()];
    await symbolicateServerFrames(frames);

    expect(captured?.url).toContain("/__nextjs_original-stack-frames");
    expect(captured?.body.frames).toHaveLength(1);
    // rsc://React/Server/webpack-internal:///./app/page.tsx?2 -> devirtualized
    expect(captured?.body.frames[0].file).toBe("webpack-internal:///./app/page.tsx");
    expect(captured?.body.frames[0].methodName).toBe("ServerComponent");
    expect(captured?.body.isServer).toBe(true);
    expect(captured?.body.isAppDirectory).toBe(true);
  });

  it("maps symbolicated locations back onto the original frame indices, leaving others intact", async () => {
    const clientA = makeClientFrame();
    const serverB = { ...makeServerFrame(), functionName: "ServerB" } as StackFrame;
    const clientC = { ...makeClientFrame(), functionName: "ClientC" } as StackFrame;
    const serverD = { ...makeServerFrame(), functionName: "ServerD" } as StackFrame;
    const frames = [clientA, serverB, clientC, serverD];

    // Results are indexed by server-frame order: [serverB, serverD].
    globalThis.fetch = respondWith([
      fulfilled("app/b.tsx", 11, 1),
      fulfilled("app/d.tsx", 33, 3),
    ]);

    const result = await symbolicateServerFrames(frames);

    expect(result[0]).toBe(clientA);
    expect(result[2]).toBe(clientC);
    expect(result[1]).toMatchObject({
      fileName: "app/b.tsx",
      lineNumber: 11,
      columnNumber: 1,
      isSymbolicated: true,
      functionName: "ServerB",
    });
    expect(result[3]).toMatchObject({
      fileName: "app/d.tsx",
      lineNumber: 33,
      columnNumber: 3,
      isSymbolicated: true,
      functionName: "ServerD",
    });
  });

  it("devirtualizes about://React URLs and URLs without a query suffix", async () => {
    let captured: CapturedRequest | undefined;
    globalThis.fetch = respondWith(
      [fulfilled("app/x.tsx", 1, 1), fulfilled("app/y.tsx", 2, 2)],
      (request) => {
        captured = request;
      },
    );

    const aboutFrame = {
      ...makeServerFrame(),
      fileName: "about://React/Server/webpack-internal:///./app/x.tsx",
    } as StackFrame;
    const noQueryFrame = {
      ...makeServerFrame(),
      fileName: "rsc://React/Prerender/webpack-internal:///./app/y.tsx",
    } as StackFrame;

    await symbolicateServerFrames([aboutFrame, noQueryFrame]);

    expect(captured?.body.frames[0].file).toBe("webpack-internal:///./app/x.tsx");
    expect(captured?.body.frames[1].file).toBe("webpack-internal:///./app/y.tsx");
  });

  it("leaves a frame un-symbolicated when its result is rejected, ignored, or missing a file", async () => {
    const frames = [
      { ...makeServerFrame(), functionName: "Rejected" } as StackFrame,
      { ...makeServerFrame(), functionName: "Ignored" } as StackFrame,
      { ...makeServerFrame(), functionName: "NoFile" } as StackFrame,
      { ...makeServerFrame(), functionName: "Ok" } as StackFrame,
    ];

    globalThis.fetch = respondWith([
      { status: "rejected", reason: "boom" },
      fulfilled("app/ignored.tsx", 1, 1, true),
      { status: "fulfilled", value: { originalStackFrame: { file: null, line1: 1, column1: 1, ignored: false } } },
      fulfilled("app/ok.tsx", 9, 9),
    ]);

    const result = await symbolicateServerFrames(frames);

    expect(result[0].isSymbolicated).toBeFalsy();
    expect(result[1].isSymbolicated).toBeFalsy();
    expect(result[1].fileName).not.toBe("app/ignored.tsx");
    expect(result[2].isSymbolicated).toBeFalsy();
    expect(result[3]).toMatchObject({ fileName: "app/ok.tsx", isSymbolicated: true });
  });
});
