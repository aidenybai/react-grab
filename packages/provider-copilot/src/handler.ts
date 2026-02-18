import { execa, type ResultPromise } from "execa";
import type {
  AgentHandler,
  AgentMessage,
  AgentRunOptions,
} from "@react-grab/relay";
import { COMPLETED_STATUS } from "@react-grab/relay";
import { formatSpawnError } from "@react-grab/utils/server";

export interface CopilotAgentOptions extends AgentRunOptions {
  model?: string;
}

const copilotSessionMap = new Map<string, string>();
const activeProcesses = new Map<string, ResultPromise>();
let lastCopilotSessionId: string | undefined;

const runCopilotAgent = async function* (
  prompt: string,
  options?: CopilotAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const copilotArgs = ["-p", prompt, "--silent", "--allow-all", "--no-color"];

  if (options?.model) {
    copilotArgs.push("--model", options.model);
  }

  const copilotSessionId = sessionId
    ? copilotSessionMap.get(sessionId)
    : undefined;

  if (copilotSessionId) {
    copilotArgs.push("--resume", copilotSessionId);
  }

  const workspacePath =
    options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd();

  let copilotProcess: ResultPromise | undefined;
  let stderrBuffer = "";

  try {
    yield { type: "status", content: "Thinking…" };

    copilotProcess = execa("copilot", copilotArgs, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: workspacePath,
      env: { ...process.env },
    });

    if (sessionId) {
      activeProcesses.set(sessionId, copilotProcess);
    }

    if (copilotProcess.stderr) {
      copilotProcess.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });
    }

    const messageQueue: AgentMessage[] = [];
    let resolveWait: (() => void) | null = null;
    let processEnded = false;

    const enqueueMessage = (message: AgentMessage) => {
      messageQueue.push(message);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    if (copilotProcess.stdout) {
      copilotProcess.stdout.on("data", (chunk: Buffer) => {
        const trimmedChunk = chunk.toString().trim();
        if (trimmedChunk) {
          enqueueMessage({ type: "status", content: trimmedChunk });
        }
      });
    }

    const childProcess = copilotProcess;
    childProcess.on("close", (code) => {
      if (sessionId) {
        activeProcesses.delete(sessionId);
      }

      if (sessionId && !childProcess.killed) {
        copilotSessionMap.set(sessionId, sessionId);
        lastCopilotSessionId = sessionId;
      }

      processEnded = true;

      if (!childProcess.killed) {
        if (code !== 0) {
          const errorDetail =
            stderrBuffer.trim() || `copilot exited with code ${code}`;
          enqueueMessage({ type: "error", content: errorDetail });
        } else {
          enqueueMessage({ type: "status", content: COMPLETED_STATUS });
        }
      }

      enqueueMessage({ type: "done", content: "" });
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    });

    childProcess.on("error", (error) => {
      if (sessionId) {
        activeProcesses.delete(sessionId);
      }
      processEnded = true;
      const isNotInstalled = "code" in error && error.code === "ENOENT";
      if (isNotInstalled) {
        enqueueMessage({
          type: "error",
          content:
            "copilot CLI is not installed. Please install GitHub Copilot CLI to use this provider.\n\nInstallation: npm install -g @github/copilot-cli",
        });
      } else {
        const errorMessage = formatSpawnError(error, "copilot");
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
        if (copilotProcess && !copilotProcess.killed) {
          copilotProcess.kill("SIGTERM");
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
        ? formatSpawnError(error, "copilot")
        : "Unknown error";
    const stderrContent = stderrBuffer.trim();
    const fullError = stderrContent
      ? `${errorMessage}\n\nstderr:\n${stderrContent}`
      : errorMessage;
    yield { type: "error", content: fullError };
    yield { type: "done", content: "" };
  }
};

const abortCopilotAgent = (sessionId: string) => {
  const activeProcess = activeProcesses.get(sessionId);
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill("SIGTERM");
  }
  activeProcesses.delete(sessionId);
};

const undoCopilotAgent = async (): Promise<void> => {
  if (!lastCopilotSessionId) {
    return;
  }

  try {
    const workspacePath = process.env.REACT_GRAB_CWD ?? process.cwd();

    await execa(
      "copilot",
      [
        "-p",
        "undo the last change you made",
        "--silent",
        "--allow-all",
        "--no-color",
        "--resume",
        lastCopilotSessionId,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        cwd: workspacePath,
        env: { ...process.env },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? formatSpawnError(error, "copilot")
        : "Unknown error";
    throw new Error(`Undo failed: ${errorMessage}`);
  }
};

export const copilotAgentHandler: AgentHandler = {
  agentId: "copilot",
  run: runCopilotAgent,
  abort: abortCopilotAgent,
  undo: undoCopilotAgent,
};
