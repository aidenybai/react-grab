import { createOpencode } from "@opencode-ai/sdk";
import fkill from "fkill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

try {
  fetch(`https://www.react-grab.com/api/version?source=opencode&t=${Date.now()}`).catch(() => {});
} catch {}

import {
  sleep,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

export interface OpenCodeAgentOptions extends AgentCoreOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpenCodeAgentContext = AgentContext<OpenCodeAgentOptions>;

interface OpenCodeInstance {
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  server: Awaited<ReturnType<typeof createOpencode>>["server"];
}

const OPENCODE_SDK_PORT = 4096;

interface LastMessageInfo {
  sessionId: string;
  messageId: string;
}

let opencodeInstance: OpenCodeInstance | null = null;
const sessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();
let lastMessageInfo: LastMessageInfo | undefined;

const getOpenCodeClient = async () => {
  if (!opencodeInstance) {
    await fkill(`:${OPENCODE_SDK_PORT}`, { force: true, silent: true }).catch(
      () => {},
    );
    await sleep(100);
    const instance = await createOpencode({
      hostname: "127.0.0.1",
      port: OPENCODE_SDK_PORT,
    });
    opencodeInstance = instance;
  }
  return opencodeInstance.client;
};

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

    if (eventData.type === "message.part.updated" && eventData.properties?.part) {
      const part = eventData.properties.part;

      if (part.sessionID !== opencodeSessionId) continue;

      if (part.messageID) {
        lastMessageInfo = { sessionId: opencodeSessionId, messageId: part.messageID };
      }

      if (part.type === "text" && part.text) {
        const truncatedText = part.text.length > 100
          ? `${part.text.slice(0, 100)}...`
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

export const runAgent = async function* (
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

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<OpenCodeAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const isFollowUp = Boolean(sessionId && sessionMap.has(sessionId));
    const formattedPrompt = isFollowUp
      ? prompt
      : `
User Request: ${prompt}

Context:
${content}
`;

    return streamSSE(context, async (stream) => {
      for await (const message of runAgent(formattedPrompt, { ...options, sessionId })) {
        if (message.type === "error") {
          await stream.writeSSE({ data: `Error: ${message.content}`, event: "error" });
        } else {
          await stream.writeSSE({ data: message.content, event: message.type });
        }
      }
    });
  });

  honoApplication.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    abortedSessions.add(sessionId);
    return context.json({ status: "ok" });
  });

  honoApplication.post("/undo", async (context) => {
    if (!lastMessageInfo) {
      return context.json({ status: "error", message: "No message to undo" });
    }

    try {
      const client = await getOpenCodeClient();

      await client.session.revert({
        path: { id: lastMessageInfo.sessionId },
        body: { messageID: lastMessageInfo.messageId },
      });

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "opencode" });
  });

  return honoApplication;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(OpenCode)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
