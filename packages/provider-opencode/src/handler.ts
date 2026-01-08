import { createOpencode } from "@opencode-ai/sdk";
import fkill from "fkill";
import type { AgentHandler, AgentMessage, AgentRunOptions } from "@react-grab/relay";
import { COMPLETED_STATUS, OPENCODE_SDK_PORT, POST_KILL_DELAY_MS, STATUS_TEXT_TRUNCATE_LENGTH } from "./constants.js";

export interface OpenCodeAgentOptions extends AgentRunOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

interface OpenCodeInstance {
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  server: Awaited<ReturnType<typeof createOpencode>>["server"];
}

interface OpenCodeEvent {
  type: string;
  properties?: {
    sessionID?: string;
    messageID?: string;
    part?: {
      type: string;
      text?: string;
      state?: string;
      toolName?: string;
      sessionID?: string;
      messageID?: string;
    };
  };
}

interface LastMessageInfo {
  sessionId: string;
  messageId: string;
}

let opencodeInstance: OpenCodeInstance | null = null;
const sessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();
let lastMessageInfo: LastMessageInfo | undefined;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getOpenCodeClient = async () => {
  if (!opencodeInstance) {
    await fkill(`:${OPENCODE_SDK_PORT}`, { force: true, silent: true }).catch(
      () => {},
    );
    await sleep(POST_KILL_DELAY_MS);
    const instance = await createOpencode({
      hostname: "127.0.0.1",
      port: OPENCODE_SDK_PORT,
    });
    opencodeInstance = instance;
  }
  return opencodeInstance.client;
};

const executeOpenCodePrompt = async (
  prompt: string,
  options?: OpenCodeAgentOptions,
  onStatus?: (text: string) => void,
  reactGrabSessionId?: string,
  signal?: { aborted: boolean },
): Promise<string> => {
  const client = await getOpenCodeClient();

  onStatus?.("Thinking…");

  let opencodeSessionId: string;

  if (reactGrabSessionId && sessionMap.has(reactGrabSessionId)) {
    opencodeSessionId = sessionMap.get(reactGrabSessionId)!;
  } else {
    const sessionResponse = await client.session.create({
      body: { title: "React Grab Session" },
    });

    if (sessionResponse.error || !sessionResponse.data) {
      throw new Error("Failed to create session");
    }

    opencodeSessionId = sessionResponse.data.id;

    if (reactGrabSessionId) {
      sessionMap.set(reactGrabSessionId, opencodeSessionId);
    }
  }

  const modelConfig = options?.model
    ? {
        providerID: options.model.split("/")[0],
        modelID: options.model.split("/")[1] || options.model,
      }
    : undefined;

  const eventStreamResult = await client.event.subscribe();

  await client.session.promptAsync({
    path: { id: opencodeSessionId },
    body: {
      ...(modelConfig && { model: modelConfig }),
      parts: [{ type: "text", text: prompt }],
    },
  });

  for await (const event of eventStreamResult.stream) {
    if (signal?.aborted) break;

    const eventData = event as OpenCodeEvent;

    if (eventData.type === "session.idle") {
      const idleSessionId = eventData.properties?.sessionID;
      if (idleSessionId === opencodeSessionId) {
        break;
      }
    }

    if (
      eventData.type === "message.part.updated" &&
      eventData.properties?.part
    ) {
      const part = eventData.properties.part;

      if (part.sessionID !== opencodeSessionId) continue;

      if (part.messageID) {
        lastMessageInfo = {
          sessionId: opencodeSessionId,
          messageId: part.messageID,
        };
      }

      if (part.type === "text" && part.text) {
        const truncatedText =
          part.text.length > STATUS_TEXT_TRUNCATE_LENGTH
            ? `${part.text.slice(0, STATUS_TEXT_TRUNCATE_LENGTH)}...`
            : part.text;
        onStatus?.(truncatedText);
      } else if (part.type === "tool-invocation" && part.toolName) {
        const stateLabel = part.state === "running" ? "Running" : "Using";
        onStatus?.(`${stateLabel} ${part.toolName}`);
      }
    }
  }

  return opencodeSessionId;
};

const runOpenCodeAgent = async function* (
  prompt: string,
  options?: OpenCodeAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const signal = { aborted: false };

  const isAborted = () => {
    if (options?.signal?.aborted) {
      signal.aborted = true;
      return true;
    }
    if (sessionId && abortedSessions.has(sessionId)) {
      signal.aborted = true;
      return true;
    }
    return false;
  };

  const messageQueue: AgentMessage[] = [];
  let resolveWait: (() => void) | null = null;

  const enqueueMessage = (message: AgentMessage) => {
    messageQueue.push(message);
    if (resolveWait) {
      resolveWait();
      resolveWait = null;
    }
  };

  try {
    const executePromise = executeOpenCodePrompt(
      prompt,
      options,
      (text) => {
        if (!isAborted()) {
          enqueueMessage({ type: "status", content: text });
        }
      },
      sessionId,
      signal,
    );

    let isDone = false;

    executePromise
      .then(() => {
        if (!isAborted()) {
          enqueueMessage({ type: "status", content: COMPLETED_STATUS });
          enqueueMessage({ type: "done", content: "" });
        }
        isDone = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      })
      .catch((error) => {
        if (!isAborted()) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const stderr =
            error instanceof Error && "stderr" in error
              ? String(error.stderr)
              : undefined;
          const fullError =
            stderr && stderr.trim()
              ? `${errorMessage}\n\nstderr:\n${stderr.trim()}`
              : errorMessage;
          enqueueMessage({ type: "error", content: fullError });
          enqueueMessage({ type: "done", content: "" });
        }
        isDone = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      });

    while (true) {
      if (isAborted()) {
        return;
      }

      if (messageQueue.length > 0) {
        const message = messageQueue.shift()!;
        if (message.type === "done") {
          yield message;
          return;
        }
        yield message;
      } else if (isDone) {
        return;
      } else {
        await new Promise<void>((resolve) => {
          resolveWait = resolve;
        });
      }
    }
  } finally {
    if (sessionId) {
      abortedSessions.delete(sessionId);
    }
  }
};

const abortOpenCodeAgent = (sessionId: string) => {
  abortedSessions.add(sessionId);
};

const undoOpenCodeAgent = async (): Promise<void> => {
  if (!lastMessageInfo) {
    return;
  }

  const client = await getOpenCodeClient();

  await client.session.revert({
    path: { id: lastMessageInfo.sessionId },
    body: { messageID: lastMessageInfo.messageId },
  });
};

export const openCodeAgentHandler: AgentHandler = {
  agentId: "opencode",
  run: runOpenCodeAgent,
  abort: abortOpenCodeAgent,
  undo: undoOpenCodeAgent,
};
