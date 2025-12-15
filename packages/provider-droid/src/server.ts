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
  fetch(
    `https://www.react-grab.com/api/version?source=droid&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

import {
  sleep,
  formatSpawnError,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

export interface DroidAgentOptions extends AgentCoreOptions {
  autoLevel?: "low" | "medium" | "high";
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  workspace?: string;
}

type DroidAgentContext = AgentContext<DroidAgentOptions>;

interface DroidStreamEvent {
  type: "system" | "message" | "tool_call" | "tool_result" | "completion";
  subtype?: "init" | "success" | "error";
  role?: "user" | "assistant";
  text?: string;
  toolName?: string;
  finalText?: string;
  session_id?: string;
  is_error?: boolean;
}

const droidSessionMap = new Map<string, string>();
const activeProcesses = new Map<string, ResultPromise>();
let lastDroidSessionId: string | undefined;

const parseStreamLine = (line: string): DroidStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as DroidStreamEvent;
  } catch {
    return null;
  }
};

export const runAgent = async function* (
  prompt: string,
  options?: DroidAgentOptions,
): AsyncGenerator<AgentMessage> {
  const droidArgs = ["exec", "--output-format", "stream-json"];

  const autoLevel = options?.autoLevel ?? "low";
  droidArgs.push("--auto", autoLevel);

  if (options?.model) {
    droidArgs.push("--model", options.model);
  }

  if (options?.reasoningEffort) {
    droidArgs.push("--reasoning-effort", options.reasoningEffort);
  }

  const workspacePath =
    options?.workspace ??
    options?.cwd ??
    process.env.REACT_GRAB_CWD ??
    process.cwd();
  droidArgs.push("--cwd", workspacePath);

  const droidSessionId = options?.sessionId
    ? droidSessionMap.get(options.sessionId)
    : undefined;

  if (droidSessionId) {
    droidArgs.push("--session-id", droidSessionId);
  }

  let droidProcess: ResultPromise | undefined;
  let stderrBuffer = "";

  try {
    yield { type: "status", content: "Thinking…" };

    droidProcess = execa("droid", droidArgs, {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });

    if (options?.sessionId) {
      activeProcesses.set(options.sessionId, droidProcess);
    }

    if (droidProcess.stderr) {
      droidProcess.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });
    }

    const messageQueue: AgentMessage[] = [];
    let resolveWait: (() => void) | null = null;
    let processEnded = false;
    let capturedDroidSessionId: string | undefined;

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

      if (!capturedDroidSessionId && event.session_id) {
        capturedDroidSessionId = event.session_id;
      }

      switch (event.type) {
        case "message": {
          if (event.role === "assistant" && event.text) {
            enqueueMessage({ type: "status", content: event.text });
          }
          break;
        }

        case "tool_call": {
          if (event.toolName) {
            enqueueMessage({
              type: "status",
              content: `Running ${event.toolName}…`,
            });
          }
          break;
        }

        case "completion": {
          if (event.is_error) {
            enqueueMessage({
              type: "error",
              content: event.finalText || "Unknown error",
            });
          } else {
            enqueueMessage({ type: "status", content: COMPLETED_STATUS });
          }
          break;
        }
      }
    };

    let buffer = "";

    if (droidProcess.stdout) {
      droidProcess.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          processLine(line);
        }
      });
    }

    if (droidProcess.stdin) {
      droidProcess.stdin.write(prompt);
      droidProcess.stdin.end();
    }

    const childProcess = droidProcess;
    childProcess.on("close", (code) => {
      if (options?.sessionId) {
        activeProcesses.delete(options.sessionId);
      }
      if (buffer.trim()) {
        processLine(buffer);
      }
      if (options?.sessionId && capturedDroidSessionId) {
        droidSessionMap.set(options.sessionId, capturedDroidSessionId);
      }
      if (capturedDroidSessionId) {
        lastDroidSessionId = capturedDroidSessionId;
      }
      processEnded = true;
      if (code !== 0 && !childProcess.killed) {
        enqueueMessage({
          type: "error",
          content: `droid exec exited with code ${code}`,
        });
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
          content:
            "droid CLI is not installed. Please install Factory CLI to use this provider.\n\nInstallation: curl -fsSL https://app.factory.ai/cli | sh",
        });
      } else {
        const errorMessage = formatSpawnError(error, "droid");
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
        if (droidProcess && !droidProcess.killed) {
          droidProcess.kill("SIGTERM");
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
        ? formatSpawnError(error, "droid")
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
    const body = await context.req.json<DroidAgentContext>();
    const { content, prompt, options, sessionId } = body;

    const droidSessionId = sessionId
      ? droidSessionMap.get(sessionId)
      : undefined;
    const isFollowUp = Boolean(droidSessionId);

    const userPrompt = isFollowUp
      ? prompt
      : `${prompt}

Here is the selected React element context (file path, component name, and source code):

${content}`;

    return streamSSE(context, async (stream) => {
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
    if (!lastDroidSessionId) {
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      const droidArgs = [
        "exec",
        "--output-format",
        "stream-json",
        "--auto",
        "low",
        "--session-id",
        lastDroidSessionId,
      ];

      const workspacePath = process.env.REACT_GRAB_CWD ?? process.cwd();

      const droidProcess = execa("droid", droidArgs, {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env },
        cwd: workspacePath,
      });

      if (droidProcess.stdin) {
        droidProcess.stdin.write("undo the last change you made");
        droidProcess.stdin.end();
      }

      await droidProcess;
      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "droid" });
  });

  return app;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Factory Droid)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
