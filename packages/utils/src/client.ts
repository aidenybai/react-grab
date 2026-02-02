export const CONNECTION_CHECK_TTL_MS = 5000;
export const STORAGE_KEY = "react-grab:agent-sessions";

export interface SSEEvent {
  eventType: string;
  data: string;
}

export const parseSSEEvent = (eventBlock: string): SSEEvent => {
  let eventType = "";
  let data = "";
  for (const line of eventBlock.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { eventType, data };
};

export const streamSSE = async function* (
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    reader.cancel().catch(() => {});
  };

  signal.addEventListener("abort", onAbort, { once: true });

  try {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    while (true) {
      const result = await reader.read();

      if (aborted || signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const { done, value } = result;
      if (value) buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const { eventType, data } = parseSSEEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);

        if (eventType === "done") return;
        if (eventType === "error") throw new Error(data || "Agent error");
        if (data) yield data;
      }

      if (done) break;
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {}
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export interface StoredAgentContext {
  content: string[];
  prompt: string;
  options?: unknown;
  sessionId?: string;
}

export const getStoredAgentContext = (
  storage: { getItem: (key: string) => string | null },
  sessionId: string,
  storageKey: string = STORAGE_KEY,
): StoredAgentContext => {
  const rawSessions = storage.getItem(storageKey);
  if (!rawSessions) throw new Error("No sessions to resume");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSessions);
  } catch {
    throw new Error("Failed to parse stored sessions");
  }

  if (!isRecord(parsed)) throw new Error("Invalid stored sessions");

  const storedSession = parsed[sessionId];
  if (!isRecord(storedSession)) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const context = storedSession.context;
  if (!isRecord(context)) throw new Error(`Session ${sessionId} is invalid`);

  const content = context.content;
  const prompt = context.prompt;
  if (!Array.isArray(content) || typeof prompt !== "string") {
    throw new Error(`Session ${sessionId} is invalid`);
  }

  const options = context.options;
  const storedSessionId = context.sessionId;

  return {
    content,
    prompt,
    options,
    sessionId:
      typeof storedSessionId === "string" ? storedSessionId : undefined,
  };
};

export interface StreamAgentStatusFromServerOptions {
  serverUrl: string;
  completedStatus: string;
  agentPath?: string;
  abortPath?: (sessionId: string) => string;
  pollIntervalMs?: number;
}

export const streamAgentStatusFromServer = async function* <
  TContext extends {
    sessionId?: string;
  },
>(
  options: StreamAgentStatusFromServerOptions,
  context: TContext,
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const startTime = Date.now();
  const sessionId = context.sessionId;
  const pollIntervalMs = options.pollIntervalMs ?? 100;
  const agentUrl = `${options.serverUrl}${options.agentPath ?? "/agent"}`;

  const handleAbort = () => {
    if (!sessionId) return;
    const abortPath = options.abortPath?.(sessionId) ?? `/abort/${sessionId}`;
    fetch(`${options.serverUrl}${abortPath}`, { method: "POST" }).catch(
      () => {},
    );
  };

  signal.addEventListener("abort", handleAbort, { once: true });

  try {
    const response = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const iterator = streamSSE(response.body, signal)[Symbol.asyncIterator]();
    let isDone = false;
    let pendingNext = iterator.next();
    let lastStatus: string | null = null;

    while (!isDone) {
      const result = await Promise.race([
        pendingNext.then((iteratorResult: IteratorResult<string, void>) => ({
          type: "status" as const,
          iteratorResult,
        })),
        new Promise<{ type: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ type: "timeout" }), pollIntervalMs),
        ),
      ]);

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      if (result.type === "status") {
        const iteratorResult = result.iteratorResult;
        isDone = iteratorResult.done ?? false;
        if (!isDone && iteratorResult.value) {
          lastStatus = iteratorResult.value;
          pendingNext = iterator.next();
        }
      }

      if (lastStatus === options.completedStatus) {
        yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
      } else if (lastStatus) {
        yield `${lastStatus} ${elapsedSeconds.toFixed(1)}s`;
      } else {
        yield `Working… ${elapsedSeconds.toFixed(1)}s`;
      }
    }
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
};

export const createCachedConnectionChecker = (
  checkConnection: () => Promise<boolean>,
  ttlMs: number = CONNECTION_CHECK_TTL_MS,
): (() => Promise<boolean>) => {
  let cache: { result: boolean; timestamp: number } | null = null;

  return async () => {
    const now = Date.now();
    if (cache && now - cache.timestamp < ttlMs) return cache.result;

    try {
      const result = await checkConnection();
      cache = { result, timestamp: now };
      return result;
    } catch {
      cache = { result: false, timestamp: now };
      return false;
    }
  };
};
