import { Codex } from "@openai/codex-sdk";
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
  fetch(
    `https://www.react-grab.com/api/version?source=codex&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

import {
  sleep,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

export interface CodexAgentOptions extends AgentCoreOptions {
  model?: string;
  workingDirectory?: string;
}

type CodexAgentContext = AgentContext<CodexAgentOptions>;

type CodexThread = ReturnType<Codex["startThread"]>;

interface ThreadState {
  thread: CodexThread;
  threadId: string;
}

let codexInstance: Codex | null = null;
const threadMap = new Map<string, ThreadState>();
const abortControllers = new Map<string, AbortController>();
let lastThreadId: string | undefined;

const getCodexInstance = (): Codex => {
  if (!codexInstance) {
    codexInstance = new Codex();
  }
  return codexInstance;
};

const getOrCreateThread = (
  sessionId: string | undefined,
  options?: CodexAgentOptions,
): { thread: CodexThread; isExisting: boolean } => {
  const codex = getCodexInstance();

  if (sessionId && threadMap.has(sessionId)) {
    return { thread: threadMap.get(sessionId)!.thread, isExisting: true };
  }

  const thread = codex.startThread({
    workingDirectory:
      options?.workingDirectory ?? process.env.REACT_GRAB_CWD ?? process.cwd(),
  });

  return { thread, isExisting: false };
};

interface CodexEventItem {
  type: string;
  text?: string;
  command?: string;
}

interface CodexEvent {
  type: string;
  item?: CodexEventItem;
}

const formatStreamEvent = (event: CodexEvent): string | undefined => {
  switch (event.type) {
    case "item.completed":
      if (event.item?.type === "agent_message" && event.item.text) {
        return event.item.text;
      }
      if (event.item?.type === "command_execution" && event.item.command) {
        return `Executed: ${event.item.command}`;
      }
      return undefined;
    case "turn.completed":
      return undefined;
    default:
      return undefined;
  }
};

export const runAgent = async function* (
  prompt: string,
  options?: CodexAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const abortController = new AbortController();

  if (sessionId) {
    abortControllers.set(sessionId, abortController);
  }

  const isAborted = () => {
    if (options?.signal?.aborted) return true;
    if (abortController.signal.aborted) return true;
    return false;
  };

  try {
    yield { type: "status", content: "Thinking…" };

    const { thread } = getOrCreateThread(sessionId, {
      ...options,
      workingDirectory: options?.workingDirectory ?? options?.cwd,
    });

    if (sessionId && thread.id) {
      lastThreadId = thread.id;
    }

    const { events } = await thread.runStreamed(prompt);

    for await (const event of events) {
      if (isAborted()) break;

      const statusText = formatStreamEvent(event as CodexEvent);
      if (statusText && !isAborted()) {
        yield { type: "status", content: statusText };
      }
    }

    if (sessionId && !isAborted() && thread.id) {
      threadMap.set(sessionId, { thread, threadId: thread.id });
    }

    if (!isAborted()) {
      yield { type: "status", content: COMPLETED_STATUS };
      yield { type: "done", content: "" };
    }
  } catch (error) {
    if (!isAborted()) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      yield { type: "error", content: errorMessage };
      yield { type: "done", content: "" };
    }
  } finally {
    if (sessionId) {
      abortControllers.delete(sessionId);
    }
  }
};

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<CodexAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const isFollowUp = Boolean(sessionId && threadMap.has(sessionId));
    const contentItems = Array.isArray(content) ? content : [content];

    return streamSSE(context, async (stream) => {
      for (let i = 0; i < contentItems.length; i++) {
        const elementContent = contentItems[i];
        const formattedPrompt = isFollowUp
          ? prompt
          : `User Request: ${prompt}\n\nContext:\n${elementContent}`;

        if (contentItems.length > 1) {
          await stream.writeSSE({
            data: `Processing element ${i + 1} of ${contentItems.length}...`,
            event: "status",
          });
        }

        for await (const message of runAgent(formattedPrompt, {
          ...options,
          sessionId,
        })) {
          if (message.type === "error") {
            await stream.writeSSE({
              data: `Error: ${message.content}`,
              event: "error",
            });
          } else {
            await stream.writeSSE({
              data: message.content,
              event: message.type,
            });
          }
        }
      }
    });
  });

  honoApplication.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    const abortController = abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      abortControllers.delete(sessionId);
    }
    return context.json({ status: "ok" });
  });

  honoApplication.post("/undo", async (context) => {
    if (!lastThreadId) {
      return context.json({ status: "error", message: "No thread to undo" });
    }

    try {
      const codex = getCodexInstance();
      const thread = codex.resumeThread(lastThreadId);

      await thread.run("Please undo the last change you made.");

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "codex" });
  });

  return honoApplication;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Codex)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
