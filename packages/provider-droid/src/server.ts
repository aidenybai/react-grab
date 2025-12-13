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

import { sleep, formatSpawnError } from "@react-grab/utils/server";

interface DroidAgentOptions {
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
        options?.workspace ?? process.env.REACT_GRAB_CWD ?? process.cwd();
      droidArgs.push("--cwd", workspacePath);

      if (isFollowUp && droidSessionId) {
        droidArgs.push("--session-id", droidSessionId);
      }

      let droidProcess: ResultPromise | undefined;
      let stderrBuffer = "";

      try {
        await stream.writeSSE({ data: "Thinking…", event: "status" });

        droidProcess = execa("droid", droidArgs, {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env },
        });

        if (sessionId) {
          activeProcesses.set(sessionId, droidProcess);
        }

        if (droidProcess.stderr) {
          droidProcess.stderr.on("data", (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
          });
        }

        let buffer = "";
        let capturedDroidSessionId: string | undefined;

        const processLine = async (line: string) => {
          const event = parseStreamLine(line);
          if (!event) return;

          if (!capturedDroidSessionId && event.session_id) {
            capturedDroidSessionId = event.session_id;
          }

          switch (event.type) {
            case "message": {
              if (event.role === "assistant" && event.text) {
                await stream.writeSSE({ data: event.text, event: "status" });
              }
              break;
            }

            case "tool_call": {
              if (event.toolName) {
                await stream.writeSSE({
                  data: `Running ${event.toolName}…`,
                  event: "status",
                });
              }
              break;
            }

            case "completion": {
              if (event.is_error) {
                await stream.writeSSE({
                  data: `Error: ${event.finalText || "Unknown error"}`,
                  event: "error",
                });
              } else {
                await stream.writeSSE({
                  data: COMPLETED_STATUS,
                  event: "status",
                });
              }
              break;
            }
          }
        };

        if (droidProcess.stdout) {
          droidProcess.stdout.on("data", async (chunk: Buffer) => {
            buffer += chunk.toString();

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              await processLine(line);
            }
          });
        }

        if (droidProcess.stdin) {
          droidProcess.stdin.write(userPrompt);
          droidProcess.stdin.end();
        }

        if (droidProcess) {
          const childProcess = droidProcess;
          await new Promise<void>((resolve, reject) => {
            childProcess.on("close", (code) => {
              if (sessionId) {
                activeProcesses.delete(sessionId);
              }
              if (code === 0 || childProcess.killed) {
                resolve();
              } else {
                reject(new Error(`droid exec exited with code ${code}`));
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

        if (sessionId && capturedDroidSessionId) {
          droidSessionMap.set(sessionId, capturedDroidSessionId);
        }

        if (capturedDroidSessionId) {
          lastDroidSessionId = capturedDroidSessionId;
        }

        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        const isNotInstalled =
          error instanceof Error && "code" in error && error.code === "ENOENT";

        if (isNotInstalled) {
          await stream.writeSSE({
            data: `Error: droid CLI is not installed. Please install Factory CLI to use this provider.\n\nInstallation: curl -fsSL https://app.factory.ai/cli | sh`,
            event: "error",
          });
          await stream.writeSSE({ data: "", event: "done" });
          return;
        }

        const errorMessage =
          error instanceof Error
            ? formatSpawnError(error, "droid")
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
