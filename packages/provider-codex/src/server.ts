import { Codex } from "@openai/codex-sdk";
import fkill from "fkill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CodexAgentOptions {
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
    workingDirectory: options?.workingDirectory ?? process.cwd(),
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

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<CodexAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const isFollowUp = Boolean(sessionId && threadMap.has(sessionId));
    const formattedPrompt = isFollowUp
      ? prompt
      : `User Request: ${prompt}\n\nContext:\n${content}`;

    return streamSSE(context, async (stream) => {
      const abortController = new AbortController();
      if (sessionId) {
        abortControllers.set(sessionId, abortController);
      }

      const isAborted = () => abortController.signal.aborted;

      try {
        await stream.writeSSE({ data: "Thinking...", event: "status" });

        const { thread } = getOrCreateThread(sessionId, options);

        if (sessionId && thread.id) {
          lastThreadId = thread.id;
        }

        const { events } = await thread.runStreamed(formattedPrompt);

        for await (const event of events) {
          if (isAborted()) break;

          const statusText = formatStreamEvent(event as CodexEvent);
          if (statusText && !isAborted()) {
            await stream.writeSSE({ data: statusText, event: "status" });
          }
        }

        if (sessionId && !isAborted() && thread.id) {
          threadMap.set(sessionId, { thread, threadId: thread.id });
        }

        if (!isAborted()) {
          await stream.writeSSE({
            data: "Completed successfully",
            event: "status",
          });
          await stream.writeSSE({ data: "", event: "done" });
        }
      } catch (error) {
        if (!isAborted()) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await stream.writeSSE({
            data: `Error: ${errorMessage}`,
            event: "error",
          });
          await stream.writeSSE({ data: "", event: "done" });
        }
      } finally {
        if (sessionId) {
          abortControllers.delete(sessionId);
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
  console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Codex)")}`);
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
