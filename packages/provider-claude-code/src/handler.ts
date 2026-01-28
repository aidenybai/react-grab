import { execSync } from "node:child_process";
import {
  query,
  type Options,
  type SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  AgentHandler,
  AgentMessage,
  AgentRunOptions,
} from "@react-grab/relay";
import { COMPLETED_STATUS } from "@react-grab/relay";
import { formatSpawnError } from "@react-grab/utils/server";

export interface ClaudeAgentOptions
  extends AgentRunOptions, Omit<Options, "cwd"> {}

type ContentBlock = SDKAssistantMessage["message"]["content"][number];
type TextContentBlock = Extract<ContentBlock, { type: "text" }>;

const claudeSessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();
let lastClaudeSessionId: string | undefined;

const resolveClaudePath = (): string => {
  const command =
    process.platform === "win32" ? "where claude" : "which claude";
  try {
    const result = execSync(command, { encoding: "utf8" }).trim();
    return result.split("\n")[0];
  } catch {
    return "claude";
  }
};

const isTextBlock = (block: ContentBlock): block is TextContentBlock =>
  block.type === "text";

const runClaudeAgent = async function* (
  prompt: string,
  options?: ClaudeAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const isAborted = () => {
    if (options?.signal?.aborted) return true;
    if (sessionId && abortedSessions.has(sessionId)) return true;
    return false;
  };

  try {
    yield { type: "status", content: "Thinking…" };

    // HACK: https://github.com/anthropics/claude-code/issues/4619#issuecomment-3217014571
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.VSCODE_INSPECTOR_OPTIONS;

    const claudeSessionId = sessionId
      ? claudeSessionMap.get(sessionId)
      : undefined;

    const queryResult = query({
      prompt,
      options: {
        pathToClaudeCodeExecutable: resolveClaudePath(),
        includePartialMessages: true,
        env,
        ...options,
        cwd: options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd(),
        ...(claudeSessionId ? { resume: claudeSessionId } : {}),
      },
    });

    let capturedClaudeSessionId: string | undefined;

    for await (const message of queryResult) {
      if (isAborted()) break;

      if (!capturedClaudeSessionId && message.session_id) {
        capturedClaudeSessionId = message.session_id;
      }

      if (message.type === "assistant") {
        const textContent = message.message.content
          .filter(isTextBlock)
          .map((block: TextContentBlock) => block.text)
          .join(" ");

        if (textContent) {
          yield { type: "status", content: textContent };
        }
      }

      if (message.type === "result") {
        yield {
          type: "status",
          content:
            message.subtype === "success" ? COMPLETED_STATUS : "Task finished",
        };
      }
    }

    if (!isAborted() && capturedClaudeSessionId) {
      if (sessionId) {
        claudeSessionMap.set(sessionId, capturedClaudeSessionId);
      }
      lastClaudeSessionId = capturedClaudeSessionId;
    }

    if (!isAborted()) {
      yield { type: "done", content: "" };
    }
  } catch (error) {
    if (!isAborted()) {
      const errorMessage =
        error instanceof Error
          ? formatSpawnError(error, "claude")
          : "Unknown error";
      const stderr =
        error instanceof Error && "stderr" in error
          ? String(error.stderr)
          : undefined;
      const fullError =
        stderr && stderr.trim()
          ? `${errorMessage}\n\nstderr:\n${stderr.trim()}`
          : errorMessage;
      yield { type: "error", content: fullError };
      yield { type: "done", content: "" };
    }
  } finally {
    if (sessionId) {
      abortedSessions.delete(sessionId);
    }
  }
};

const abortClaudeAgent = (sessionId: string) => {
  abortedSessions.add(sessionId);
};

const undoClaudeAgent = async (): Promise<void> => {
  if (!lastClaudeSessionId) {
    return;
  }

  try {
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.VSCODE_INSPECTOR_OPTIONS;

    const queryResult = query({
      prompt: "undo",
      options: {
        pathToClaudeCodeExecutable: resolveClaudePath(),
        env,
        cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
        resume: lastClaudeSessionId,
      },
    });

    // HACK: consume all messages to complete the undo
    for await (const _message of queryResult) {
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? formatSpawnError(error, "claude")
        : "Unknown error";
    const stderr =
      error instanceof Error && "stderr" in error
        ? String(error.stderr)
        : undefined;
    const fullError =
      stderr && stderr.trim()
        ? `${errorMessage}\n\nstderr:\n${stderr.trim()}`
        : errorMessage;
    throw new Error(`Undo failed: ${fullError}`);
  }
};

export const claudeAgentHandler: AgentHandler = {
  agentId: "claude-code",
  run: runClaudeAgent,
  abort: abortClaudeAgent,
  undo: undoClaudeAgent,
};
