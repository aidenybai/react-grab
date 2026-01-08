import { execa, type ResultPromise } from "execa";
import type { AgentHandler, AgentMessage, AgentRunOptions } from "@react-grab/relay";
import { COMPLETED_STATUS } from "@react-grab/relay";
import { formatSpawnError } from "@react-grab/utils/server";

export interface DroidAgentOptions extends AgentRunOptions {
  autoLevel?: "low" | "medium" | "high";
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  workspace?: string;
}

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

const runDroidAgent = async function* (
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

const abortDroidAgent = (sessionId: string) => {
  const activeProcess = activeProcesses.get(sessionId);
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill("SIGTERM");
  }
  activeProcesses.delete(sessionId);
};

const undoDroidAgent = async (): Promise<void> => {
  if (!lastDroidSessionId) {
    return;
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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? formatSpawnError(error, "droid")
        : "Unknown error";
    throw new Error(`Undo failed: ${errorMessage}`);
  }
};

export const droidAgentHandler: AgentHandler = {
  agentId: "droid",
  run: runDroidAgent,
  abort: abortDroidAgent,
  undo: undoDroidAgent,
};
