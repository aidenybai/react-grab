import { execa, type ResultPromise } from "execa";
import type { AgentHandler, AgentMessage, AgentRunOptions } from "@react-grab/relay";
import { formatSpawnError } from "@react-grab/utils/server";
import { COMPLETED_STATUS } from "./constants.js";

export interface GeminiAgentOptions extends AgentRunOptions {
  model?: string;
  includeDirectories?: string;
}

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

const runGeminiAgent = async function* (
  prompt: string,
  options?: GeminiAgentOptions,
): AsyncGenerator<AgentMessage> {
  const geminiArgs = ["--output-format", "stream-json", "--yolo"];

  if (options?.model) {
    geminiArgs.push("--model", options.model);
  }

  if (options?.includeDirectories) {
    geminiArgs.push("--include-directories", options.includeDirectories);
  }

  geminiArgs.push(prompt);

  let geminiProcess: ResultPromise | undefined;
  let stderrBuffer = "";

  try {
    yield { type: "status", content: "Thinking…" };

    geminiProcess = execa("gemini", geminiArgs, {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
      cwd: options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd(),
    });

    if (options?.sessionId) {
      activeProcesses.set(options.sessionId, geminiProcess);
    }

    if (geminiProcess.stderr) {
      geminiProcess.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });
    }

    const messageQueue: AgentMessage[] = [];
    let resolveWait: (() => void) | null = null;
    let processEnded = false;
    let capturedSessionId: string | undefined;

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

      if (!capturedSessionId && event.session_id) {
        capturedSessionId = event.session_id;
      }

      switch (event.type) {
        case "init":
          enqueueMessage({ type: "status", content: "Session started..." });
          break;

        case "message":
          if (event.role === "assistant" && event.content) {
            enqueueMessage({ type: "status", content: event.content });
          }
          break;

        case "tool_use":
          if (event.tool_name) {
            enqueueMessage({
              type: "status",
              content: `Using ${event.tool_name}...`,
            });
          }
          break;

        case "tool_result":
          if (event.status === "error" && event.output) {
            enqueueMessage({
              type: "status",
              content: `Tool error: ${event.output}`,
            });
          }
          break;

        case "error":
          if (event.content) {
            enqueueMessage({ type: "error", content: event.content });
          }
          break;

        case "result":
          if (event.status === "success") {
            enqueueMessage({ type: "status", content: COMPLETED_STATUS });
          } else if (event.status === "error") {
            enqueueMessage({ type: "error", content: "Task failed" });
          }
          break;
      }
    };

    let buffer = "";

    if (geminiProcess.stdout) {
      geminiProcess.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          processLine(line);
        }
      });
    }

    const childProcess = geminiProcess;
    childProcess.on("close", (code) => {
      if (options?.sessionId) {
        activeProcesses.delete(options.sessionId);
      }
      if (buffer.trim()) {
        processLine(buffer);
      }
      if (options?.sessionId && capturedSessionId) {
        geminiSessionMap.set(options.sessionId, capturedSessionId);
      }
      if (capturedSessionId) {
        lastGeminiSessionId = capturedSessionId;
      }
      processEnded = true;
      if (code !== 0 && !childProcess.killed) {
        enqueueMessage({
          type: "error",
          content: `gemini exited with code ${code}`,
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
      const errorMessage = formatSpawnError(error, "gemini");
      const stderrContent = stderrBuffer.trim();
      const fullError = stderrContent
        ? `${errorMessage}\n\nstderr:\n${stderrContent}`
        : errorMessage;
      enqueueMessage({ type: "error", content: fullError });
      enqueueMessage({ type: "done", content: "" });
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    });

    while (true) {
      if (options?.signal?.aborted) {
        if (geminiProcess && !geminiProcess.killed) {
          geminiProcess.kill("SIGTERM");
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
        ? formatSpawnError(error, "gemini")
        : "Unknown error";
    const stderrContent = stderrBuffer.trim();
    const fullError = stderrContent
      ? `${errorMessage}\n\nstderr:\n${stderrContent}`
      : errorMessage;
    yield { type: "error", content: fullError };
    yield { type: "done", content: "" };
  }
};

const abortGeminiAgent = (sessionId: string) => {
  const activeProcess = activeProcesses.get(sessionId);
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill("SIGTERM");
    activeProcesses.delete(sessionId);
  }
};

const undoGeminiAgent = async (): Promise<void> => {
  if (!lastGeminiSessionId) {
    return;
  }

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
};

export const geminiAgentHandler: AgentHandler = {
  agentId: "gemini",
  run: runGeminiAgent,
  abort: abortGeminiAgent,
  undo: undoGeminiAgent,
};
