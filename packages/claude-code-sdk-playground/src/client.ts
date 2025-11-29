import type { AgentContext, AgentProvider } from "react-grab/core";

const DEFAULT_SERVER_URL = "http://localhost:3001";

async function* streamFromServer(
  serverUrl: string,
  context: AgentContext,
  signal: AbortSignal,
) {
  const response = await fetch(`${serverUrl}/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(context),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data) {
          yield data;
        }
      }
      if (line.startsWith("event: done")) {
        return;
      }
      if (line.startsWith("event: error")) {
        throw new Error("Agent error");
      }
    }
  }
}

const sessionContextMap = new Map<string, AgentContext>();

export const createClaudeAgentProvider = (
  serverUrl: string = DEFAULT_SERVER_URL,
): AgentProvider => ({
  send: async function* (context: AgentContext, signal: AbortSignal) {
    const sessionId = `session-${Date.now()}`;
    sessionContextMap.set(sessionId, context);

    yield* streamFromServer(serverUrl, context, signal);
  },

  resume: async function* (sessionId: string, signal: AbortSignal) {
    const savedSession = sessionStorage.getItem("react-grab:agent-session");
    if (!savedSession) {
      throw new Error("No session to resume");
    }

    const session = JSON.parse(savedSession);
    const context = session.context as AgentContext;

    yield "Resuming...";
    yield* streamFromServer(serverUrl, context, signal);
  },

  supportsResume: true,
});

export const claudeAgentProvider = createClaudeAgentProvider();
