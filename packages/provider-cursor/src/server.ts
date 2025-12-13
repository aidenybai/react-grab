import { execa, type ResultPromise } from "execa";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import fkill from "fkill";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

try {
  fetch(`https://www.react-grab.com/api/version?source=cursor&t=${Date.now()}`).catch(() => {});
} catch {}

import {
  sleep,
  formatSpawnError,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

export interface CursorAgentOptions extends AgentCoreOptions {
  model?: string;
  workspace?: string;
}

type CursorAgentContext = AgentContext<CursorAgentOptions>;

interface CursorStreamEvent {
  type: "system" | "user" | "thinking" | "assistant" | "result";
  subtype?: "init" | "delta" | "completed" | "success" | "error";
  message?: {
    role: string;
    content: Array<{ type: string; text: string }>;
  };
  result?: string;
  is_error?: boolean;
  session_id?: string;
}

const cursorSessionMap = new Map<string, string>();
const activeProcesses = new Map<string, ResultPromise>();
let lastCursorChatId: string | undefined;

const parseStreamLine = (line: string): CursorStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as CursorStreamEvent;
  } catch {
    return null;
  }
};

const extractTextFromMessage = (
  message: CursorStreamEvent["message"],
): string => {
  if (!message?.content) return "";

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();
};

export const runAgent = async function* (
  prompt: string,
  options?: CursorAgentOptions,
): AsyncGenerator<AgentMessage> {
  const cursorAgentArgs = [
    "--print",
    "--output-format",
    "stream-json",
    "--force",
  ];

  if (options?.model) {
    cursorAgentArgs.push("--model", options.model);
  }

  const workspacePath =
    options?.workspace ?? options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd();

  const cursorChatId = options?.sessionId
    ? cursorSessionMap.get(options.sessionId)
    : undefined;

  if (cursorChatId) {
    cursorAgentArgs.push("--resume", cursorChatId);
  }

  let cursorProcess: ResultPromise | undefined;
  let stderrBuffer = "";

  try {
    yield { type: "status", content: "Thinking…" };

    cursorProcess = execa("cursor-agent", cursorAgentArgs, {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
      cwd: workspacePath,
    });

    if (options?.sessionId) {
      activeProcesses.set(options.sessionId, cursorProcess);
    }

    if (cursorProcess.stderr) {
      cursorProcess.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });
    }

    const messageQueue: AgentMessage[] = [];
    let resolveWait: (() => void) | null = null;
    let processEnded = false;
    let capturedCursorChatId: string | undefined;

    const enqueueMessage = (message: AgentMessage) => {
      messageQueue.push(message);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    const processLine = (line: string) => {
      const event = parseStreamLine(line);
      if (!event) return;

      if (!capturedCursorChatId && event.session_id) {
        capturedCursorChatId = event.session_id;
      }

      switch (event.type) {
        case "assistant": {
          const textContent = extractTextFromMessage(event.message);
          if (textContent) {
            enqueueMessage({ type: "status", content: textContent });
          }
          break;
        }

        case "result":
          if (event.subtype === "success") {
            enqueueMessage({ type: "status", content: COMPLETED_STATUS });
          } else if (event.subtype === "error" || event.is_error) {
            enqueueMessage({ type: "error", content: event.result || "Unknown error" });
          } else {
            enqueueMessage({ type: "status", content: "Task finished" });
          }
          break;
      }
    };

    let buffer = "";

    if (cursorProcess.stdout) {
      cursorProcess.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          processLine(line);
        }
      });
    }

    if (cursorProcess.stdin) {
      cursorProcess.stdin.write(prompt);
      cursorProcess.stdin.end();
    }

    const childProcess = cursorProcess;
    childProcess.on("close", (code) => {
      if (options?.sessionId) {
        activeProcesses.delete(options.sessionId);
      }
      if (buffer.trim()) {
        processLine(buffer);
      }
      if (options?.sessionId && capturedCursorChatId) {
        cursorSessionMap.set(options.sessionId, capturedCursorChatId);
      }
      if (capturedCursorChatId) {
        lastCursorChatId = capturedCursorChatId;
      }
      processEnded = true;
      if (code !== 0 && !childProcess.killed) {
        enqueueMessage({ type: "error", content: `cursor-agent exited with code ${code}` });
      }
      enqueueMessage({ type: "done", content: "" });
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    });

    childProcess.on("error", (error) => {
      if (options?.sessionId) {
        activeProcesses.delete(options.sessionId);
      }
      processEnded = true;
      const isNotInstalled = "code" in error && error.code === "ENOENT";
      if (isNotInstalled) {
        enqueueMessage({
          type: "error",
          content: "cursor-agent is not installed. Please install the Cursor Agent CLI to use this provider.\n\nInstallation: https://cursor.com/docs/cli/overview",
        });
      } else {
        const errorMessage = formatSpawnError(error, "cursor-agent");
        const stderrContent = stderrBuffer.trim();
        const fullError = stderrContent
          ? `${errorMessage}\n\nstderr:\n${stderrContent}`
          : errorMessage;
        enqueueMessage({ type: "error", content: fullError });
      }
      enqueueMessage({ type: "done", content: "" });
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    });

    while (true) {
      if (options?.signal?.aborted) {
        if (cursorProcess && !cursorProcess.killed) {
          cursorProcess.kill("SIGTERM");
        }
        return;
      }

      if (messageQueue.length > 0) {
        const message = messageQueue.shift()!;
        if (message.type === "done") {
          yield message;
          return;
        }
        yield message;
      } else if (processEnded) {
        return;
      } else {
        await new Promise<void>((resolve) => {
          resolveWait = resolve;
        });
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? formatSpawnError(error, "cursor-agent")
        : "Unknown error";
    const stderrContent = stderrBuffer.trim();
    const fullError = stderrContent
      ? `${errorMessage}\n\nstderr:\n${stderrContent}`
      : errorMessage;
    yield { type: "error", content: fullError };
    yield { type: "done", content: "" };
  }
};

export const createServer = () => {
  const app = new Hono();

  app.use("*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<CursorAgentContext>();
    const { content, prompt, options, sessionId } = body;

    const cursorChatId = sessionId
      ? cursorSessionMap.get(sessionId)
      : undefined;
    const isFollowUp = Boolean(cursorChatId);

    const userPrompt = isFollowUp ? prompt : `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      for await (const message of runAgent(userPrompt, { ...options, sessionId })) {
        if (message.type === "error") {
          await stream.writeSSE({ data: `Error: ${message.content}`, event: "error" });
        } else {
          await stream.writeSSE({ data: message.content, event: message.type });
        }
      }
    });
  });

  app.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    const activeProcess = activeProcesses.get(sessionId);
    if (activeProcess && !activeProcess.killed) {
      activeProcess.kill("SIGTERM");
      activeProcesses.delete(sessionId);
    }
    return context.json({ status: "ok" });
  });

  app.post("/undo", async (context) => {
    if (!lastCursorChatId) {
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      const cursorAgentArgs = [
        "--print",
        "--output-format",
        "stream-json",
        "--force",
        "--resume",
        lastCursorChatId,
      ];

      const workspacePath = process.env.REACT_GRAB_CWD ?? process.cwd();

      const cursorProcess = execa("cursor-agent", cursorAgentArgs, {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env },
        cwd: workspacePath,
      });

      if (cursorProcess.stdin) {
        cursorProcess.stdin.write("undo");
        cursorProcess.stdin.end();
      }

      await cursorProcess;
      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "cursor" });
  });

  return app;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Cursor)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
