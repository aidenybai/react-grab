import { execa, type ResultPromise } from "execa";
import type {
  AgentHandler,
  AgentMessage,
  AgentRunOptions,
} from "@react-grab/relay";
import { COMPLETED_STATUS } from "@react-grab/relay";
import { formatSpawnError } from "@react-grab/utils/server";

export interface CursorAgentOptions extends AgentRunOptions {
  model?: string;
  workspace?: string;
}

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

const runCursorAgent = async function* (
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
    options?.workspace ??
    options?.cwd ??
    process.env.REACT_GRAB_CWD ??
    process.cwd();

  const cursorChatId = options?.sessionId
    ? cursorSessionMap.get(options.sessionId)
    : undefined;

  if (cursorChatId) {
    cursorAgentArgs.push("--resume", cursorChatId);
  }

  let cursorProcess: ResultPromise | undefined;
  let stderrBuffer = "";
  let cleanupSignalListener: (() => void) | undefined;

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
    let aborted = false;
    let capturedCursorChatId: string | undefined;

    const enqueueMessage = (message: AgentMessage) => {
      messageQueue.push(message);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    const handleAbort = () => {
      aborted = true;
      if (cursorProcess && !cursorProcess.killed) {
        cursorProcess.kill("SIGTERM");
      }
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    const signal = options?.signal;
    if (signal) {
      if (signal.aborted) {
        handleAbort();
      } else {
        signal.addEventListener("abort", handleAbort, { once: true });
      }
    }

    cleanupSignalListener = () => {
      if (signal) {
        signal.removeEventListener("abort", handleAbort);
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
            enqueueMessage({
              type: "error",
              content: event.result || "Unknown error",
            });
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
        enqueueMessage({
          type: "error",
          content: `cursor-agent exited with code ${code}`,
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
            "cursor-agent is not installed. Please install the Cursor Agent CLI to use this provider.\n\nInstallation: https://cursor.com/docs/cli/overview",
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

    try {
      while (true) {
        if (aborted) {
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
    } finally {
      cleanupSignalListener?.();
    }
  } catch (error) {
    cleanupSignalListener?.();
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

const abortCursorAgent = (sessionId: string) => {
  const activeProcess = activeProcesses.get(sessionId);
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill("SIGTERM");
    activeProcesses.delete(sessionId);
  }
};

const undoCursorAgent = async (): Promise<void> => {
  if (!lastCursorChatId) {
    return;
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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? formatSpawnError(error, "cursor-agent")
        : "Unknown error";
    throw new Error(`Undo failed: ${errorMessage}`);
  }
};

export const cursorAgentHandler: AgentHandler = {
  agentId: "cursor",
  run: runCursorAgent,
  abort: abortCursorAgent,
  undo: undoCursorAgent,
};
