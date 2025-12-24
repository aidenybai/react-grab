import { execute, createUserMessage } from "@sourcegraph/amp-sdk";
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
    `https://www.react-grab.com/api/version?source=amp&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

import {
  sleep,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

export interface AmpAgentOptions extends AgentCoreOptions {}

type AmpAgentContext = AgentContext<AmpAgentOptions>;

interface ThreadState {
  threadId: string;
}

const threadMap = new Map<string, ThreadState>();
const abortControllers = new Map<string, AbortController>();
let lastThreadId: string | undefined;

const extractTextFromContent = (
  content: Array<{ type: string; text?: string; name?: string }>,
): string => {
  return content
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join(" ")
    .trim();
};

export const runAgent = async function* (
  prompt: string,
  options?: AmpAgentOptions,
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

    const executeOptions: {
      dangerouslyAllowAll: boolean;
      cwd?: string;
      continue?: boolean | string;
    } = {
      dangerouslyAllowAll: true,
    };

    executeOptions.cwd =
      options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd();

    const existingThread = sessionId ? threadMap.get(sessionId) : undefined;
    if (existingThread) {
      executeOptions.continue = existingThread.threadId;
    }

    let capturedThreadId: string | undefined;

    for await (const message of execute({
      prompt,
      options: executeOptions,
      signal: abortController.signal,
    })) {
      if (isAborted()) break;

      switch (message.type) {
        case "system":
          if (message.subtype === "init") {
            const systemMessage = message as { thread_id?: string };
            if (systemMessage.thread_id) {
              capturedThreadId = systemMessage.thread_id;
            }
            yield { type: "status", content: "Session started..." };
          }
          break;

        case "assistant": {
          const messageContent = message.message?.content;
          if (messageContent && Array.isArray(messageContent)) {
            const toolUse = messageContent.find(
              (item: { type: string }) => item.type === "tool_use",
            );
            if (toolUse && "name" in toolUse) {
              yield { type: "status", content: `Using ${toolUse.name}...` };
            } else {
              const textContent = extractTextFromContent(messageContent);
              if (textContent && !isAborted()) {
                yield { type: "status", content: textContent };
              }
            }
          }
          break;
        }

        case "result":
          if (message.is_error) {
            yield { type: "error", content: message.error || "Unknown error" };
          } else {
            yield { type: "status", content: COMPLETED_STATUS };
          }
          break;
      }
    }

    if (sessionId && capturedThreadId && !isAborted()) {
      threadMap.set(sessionId, { threadId: capturedThreadId });
    }

    if (capturedThreadId) {
      lastThreadId = capturedThreadId;
    }

    if (!isAborted()) {
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
    const requestBody = await context.req.json<AmpAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const contentItems = Array.isArray(content) ? content : [content];

    return streamSSE(context, async (stream) => {
      for (let i = 0; i < contentItems.length; i++) {
        const elementContent = contentItems[i];
        const existingThread = sessionId ? threadMap.get(sessionId) : undefined;
        const isFollowUp = Boolean(existingThread);
        const userPrompt = isFollowUp
          ? prompt
          : `${prompt}\n\n${elementContent}`;

        if (contentItems.length > 1) {
          await stream.writeSSE({
            data: `Processing element ${i + 1} of ${contentItems.length}...`,
            event: "status",
          });
        }

        for await (const message of runAgent(userPrompt, {
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
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      for await (const _message of execute({
        prompt: "undo",
        options: {
          dangerouslyAllowAll: true,
          cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
          continue: lastThreadId,
        },
      })) {
        // HACK: consume all messages to complete the undo
      }

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "amp" });
  });

  return honoApplication;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Amp)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
