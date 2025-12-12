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
  fetch(`https://www.react-grab.com/api/version?source=gemini&t=${Date.now()}`).catch(() => {});
} catch {}

import { sleep, formatSpawnError } from "@react-grab/utils/server";

interface GeminiAgentOptions {
  model?: string;
  includeDirectories?: string;
}

type GeminiAgentContext = AgentContext<GeminiAgentOptions>;

interface GeminiStreamEvent {
  type: "init" | "message" | "tool_use" | "tool_result" | "error" | "result";
  role?: "user" | "assistant";
  content?: string;
  tool_name?: string;
  tool_id?: string;
  parameters?: Record<string, unknown>;
  status?: "success" | "error";
  output?: string;
  session_id?: string;
  stats?: Record<string, unknown>;
  timestamp?: string;
  delta?: boolean;
}

const geminiSessionMap = new Map<string, string>();
const activeProcesses = new Map<string, ResultPromise>();
let lastGeminiSessionId: string | undefined;

const parseStreamLine = (line: string): GeminiStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as GeminiStreamEvent;
  } catch {
    return null;
  }
};

export const createServer = () => {
  const app = new Hono();

  app.use("*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<GeminiAgentContext>();
    const { content, prompt, options, sessionId } = body;

    const geminiSessionId = sessionId
      ? geminiSessionMap.get(sessionId)
      : undefined;
    const isFollowUp = Boolean(geminiSessionId);

    const userPrompt = isFollowUp ? prompt : `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      const geminiArgs = ["--output-format", "stream-json", "--yolo"];

      if (options?.model) {
        geminiArgs.push("--model", options.model);
      }

      if (options?.includeDirectories) {
        geminiArgs.push("--include-directories", options.includeDirectories);
      }

      geminiArgs.push(userPrompt);

      let geminiProcess: ResultPromise | undefined;
      let stderrBuffer = "";

      try {
        await stream.writeSSE({ data: "Thinking…", event: "status" });

        geminiProcess = execa("gemini", geminiArgs, {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env },
          cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
        });

        if (sessionId) {
          activeProcesses.set(sessionId, geminiProcess);
        }

        if (geminiProcess.stderr) {
          geminiProcess.stderr.on("data", (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
          });
        }

        let buffer = "";
        let capturedSessionId: string | undefined;

        const processLine = async (line: string) => {
          const event = parseStreamLine(line);
          if (!event) return;

          if (!capturedSessionId && event.session_id) {
            capturedSessionId = event.session_id;
          }

          switch (event.type) {
            case "init":
              await stream.writeSSE({
                data: "Session started...",
                event: "status",
              });
              break;

            case "message":
              if (event.role === "assistant" && event.content) {
                await stream.writeSSE({ data: event.content, event: "status" });
              }
              break;

            case "tool_use":
              if (event.tool_name) {
                await stream.writeSSE({
                  data: `Using ${event.tool_name}...`,
                  event: "status",
                });
              }
              break;

            case "tool_result":
              if (event.status === "error" && event.output) {
                await stream.writeSSE({
                  data: `Tool error: ${event.output}`,
                  event: "status",
                });
              }
              break;

            case "error":
              if (event.content) {
                await stream.writeSSE({
                  data: `Error: ${event.content}`,
                  event: "error",
                });
              }
              break;

            case "result":
              if (event.status === "success") {
                await stream.writeSSE({
                  data: COMPLETED_STATUS,
                  event: "status",
                });
              } else if (event.status === "error") {
                await stream.writeSSE({
                  data: "Task failed",
                  event: "error",
                });
              }
              break;
          }
        };

        if (geminiProcess.stdout) {
          geminiProcess.stdout.on("data", async (chunk: Buffer) => {
            buffer += chunk.toString();

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              await processLine(line);
            }
          });
        }

        if (geminiProcess) {
          const childProcess = geminiProcess;
          await new Promise<void>((resolve, reject) => {
            childProcess.on("close", (code) => {
              if (sessionId) {
                activeProcesses.delete(sessionId);
              }
              if (code === 0 || childProcess.killed) {
                resolve();
              } else {
                reject(new Error(`gemini exited with code ${code}`));
              }
            });

            childProcess.on("error", (error) => {
              if (sessionId) {
                activeProcesses.delete(sessionId);
              }
              reject(error);
            });
          });
        }

        if (buffer.trim()) {
          await processLine(buffer);
        }

        if (sessionId && capturedSessionId) {
          geminiSessionMap.set(sessionId, capturedSessionId);
        }

        if (capturedSessionId) {
          lastGeminiSessionId = capturedSessionId;
        }

        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? formatSpawnError(error, "gemini")
            : "Unknown error";
        const stderrContent = stderrBuffer.trim();
        const fullError = stderrContent
          ? `${errorMessage}\n\nstderr:\n${stderrContent}`
          : errorMessage;
        await stream.writeSSE({
          data: `Error: ${fullError}`,
          event: "error",
        });
        await stream.writeSSE({ data: "", event: "done" });
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
    if (!lastGeminiSessionId) {
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      const geminiArgs = [
        "--output-format",
        "stream-json",
        "--yolo",
        "--session",
        lastGeminiSessionId,
        "undo",
      ];

      await execa("gemini", geminiArgs, {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env },
        cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
      });

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "gemini" });
  });

  return app;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Gemini)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
