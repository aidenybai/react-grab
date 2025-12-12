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

export async function* streamSSE(
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

  signal.addEventListener("abort", onAbort);

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
}

