import { formatOwnerStack, hasDebugStack, parseStack, type StackFrame } from "bippy/source";
import { traverseFiber, type Fiber } from "bippy";
import { SYMBOLICATION_TIMEOUT_MS } from "../constants.js";
import { getNextBasePath } from "../utils/get-next-base-path.js";
import { safeDecodeURIComponent } from "../utils/safe-decode-uri-component.js";

const SERVER_COMPONENT_URL_PREFIXES = ["about://React/", "rsc://React/"];

const isServerComponentUrl = (url: string): boolean =>
  SERVER_COMPONENT_URL_PREFIXES.some((prefix) => url.startsWith(prefix));

const devirtualizeServerUrl = (url: string): string => {
  for (const prefix of SERVER_COMPONENT_URL_PREFIXES) {
    if (!url.startsWith(prefix)) continue;
    const environmentEndIndex = url.indexOf("/", prefix.length);
    if (environmentEndIndex === -1) continue;
    const pathStart = environmentEndIndex + 1;
    const querySuffixIndex = url.lastIndexOf("?");
    const rawPath =
      querySuffixIndex > pathStart ? url.slice(pathStart, querySuffixIndex) : url.slice(pathStart);
    return safeDecodeURIComponent(rawPath);
  }
  return url;
};

interface UsableOriginalFrame {
  file: string;
  line1: number | null;
  column1: number | null;
}

// Validates one entry of the dev server's PromiseSettledResult[] response down
// to exactly the fields the frame rewrite consumes; anything malformed (or
// rejected/ignored) degrades to the unsymbolicated frame.
const extractUsableOriginalFrame = (result: unknown): UsableOriginalFrame | null => {
  if (typeof result !== "object" || result === null) return null;
  if (!("status" in result) || result.status !== "fulfilled") return null;
  if (!("value" in result) || typeof result.value !== "object" || result.value === null)
    return null;
  if (!("originalStackFrame" in result.value)) return null;
  const originalFrame = result.value.originalStackFrame;
  if (typeof originalFrame !== "object" || originalFrame === null) return null;
  if (!("file" in originalFrame) || typeof originalFrame.file !== "string" || !originalFrame.file)
    return null;
  if ("ignored" in originalFrame && Boolean(originalFrame.ignored)) return null;
  return {
    file: originalFrame.file,
    line1:
      "line1" in originalFrame && typeof originalFrame.line1 === "number"
        ? originalFrame.line1
        : null,
    column1:
      "column1" in originalFrame && typeof originalFrame.column1 === "number"
        ? originalFrame.column1
        : null,
  };
};

interface NextJsRequestFrame {
  file: string;
  methodName: string;
  line1: number | null;
  column1: number | null;
  arguments: string[];
}

export const symbolicateServerFrames = async (
  frames: StackFrame[],
  externalSignal?: AbortSignal,
): Promise<StackFrame[]> => {
  const serverFrameIndices: number[] = [];
  const requestFrames: NextJsRequestFrame[] = [];

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    if (!frame.isServer || !frame.fileName) continue;

    serverFrameIndices.push(frameIndex);
    requestFrames.push({
      file: devirtualizeServerUrl(frame.fileName),
      methodName: frame.functionName ?? "<unknown>",
      line1: frame.lineNumber ?? null,
      column1: frame.columnNumber ?? null,
      arguments: [],
    });
  }

  if (requestFrames.length === 0) return frames;

  // Abort on either our own timeout or the caller's signal (the source-fetch
  // queue's timeout). Without the external signal, a queue timeout would release
  // its slot while this POST kept running, holding a dev-server connection past
  // the concurrency cap the queue exists to enforce.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYMBOLICATION_TIMEOUT_MS);
  const handleExternalAbort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", handleExternalAbort);

  try {
    // Next.js dev server (>=15.2) exposes a batched symbolication endpoint that
    // resolves bundled/virtual stack frames back to original source locations via
    // source maps. Server components produce virtual URLs like
    // "rsc://React/Server/webpack-internal:///..." that have no real file on disk.
    // We POST an array of frames and get back PromiseSettledResult[].
    // getNextBasePath() is required for apps deployed with a basePath.
    const response = await fetch(`${getNextBasePath()}/__nextjs_original-stack-frames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frames: requestFrames,
        isServer: true,
        isEdgeServer: false,
        isAppDirectory: true,
      }),
      // The one source-resolution request react-grab issues itself (bippy's
      // bundle fetches are outside our control). High priority lets the browser
      // prefer it over the app's in-flight data fetches when a connection frees,
      // shortening the grab's tail latency.
      priority: "high",
      signal: controller.signal,
    });

    if (!response.ok) return frames;

    const symbolicationResults: unknown = await response.json();
    if (!Array.isArray(symbolicationResults)) return frames;
    const symbolicatedFrames = [...frames];

    for (let resultIndex = 0; resultIndex < serverFrameIndices.length; resultIndex++) {
      const originalFrame = extractUsableOriginalFrame(symbolicationResults[resultIndex]);
      if (!originalFrame) continue;

      const originalFrameIndex = serverFrameIndices[resultIndex];
      symbolicatedFrames[originalFrameIndex] = {
        ...frames[originalFrameIndex],
        fileName: originalFrame.file,
        lineNumber: originalFrame.line1 ?? undefined,
        columnNumber: originalFrame.column1 ?? undefined,
        isSymbolicated: true,
      };
    }

    return symbolicatedFrames;
  } catch {
    return frames;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", handleExternalAbort);
  }
};

const extractServerFramesFromDebugStack = (rootFiber: Fiber): Map<string, StackFrame> => {
  const serverFramesByName = new Map<string, StackFrame>();

  traverseFiber(
    rootFiber,
    (currentFiber) => {
      if (!hasDebugStack(currentFiber)) return false;

      const ownerStack = formatOwnerStack(currentFiber._debugStack.stack);
      if (!ownerStack) return false;

      for (const frame of parseStack(ownerStack)) {
        if (!frame.functionName || !frame.fileName) continue;
        if (!isServerComponentUrl(frame.fileName)) continue;
        if (serverFramesByName.has(frame.functionName)) continue;

        serverFramesByName.set(frame.functionName, {
          ...frame,
          isServer: true,
        });
      }
      return false;
    },
    true,
  );

  return serverFramesByName;
};

export const enrichServerFrameLocations = (
  rootFiber: Fiber,
  frames: StackFrame[],
): StackFrame[] => {
  const hasUnresolvedServerFrames = frames.some(
    (frame) => frame.isServer && !frame.fileName && frame.functionName,
  );
  if (!hasUnresolvedServerFrames) return frames;

  const serverFramesByName = extractServerFramesFromDebugStack(rootFiber);
  if (serverFramesByName.size === 0) return frames;

  return frames.map((frame) => {
    if (!frame.isServer || frame.fileName || !frame.functionName) return frame;
    const matchingServerFrame = serverFramesByName.get(frame.functionName);
    if (!matchingServerFrame) return frame;
    return {
      ...frame,
      fileName: matchingServerFrame.fileName,
      lineNumber: matchingServerFrame.lineNumber,
      columnNumber: matchingServerFrame.columnNumber,
    };
  });
};
