import { execute } from "@sourcegraph/amp-sdk";
import type { AgentHandler, AgentMessage, AgentRunOptions } from "@react-grab/relay";
import { COMPLETED_STATUS } from "./constants.js";

export interface AmpAgentOptions extends AgentRunOptions {}

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

const runAmpAgent = async function* (
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
      threadMap.delete(sessionId);
    }
  }
};

const abortAmpAgent = (sessionId: string) => {
  const abortController = abortControllers.get(sessionId);
  if (abortController) {
    abortController.abort();
    abortControllers.delete(sessionId);
  }
};

const undoAmpAgent = async (): Promise<void> => {
  if (!lastThreadId) {
    return;
  }

  // HACK: consume all messages to complete the undo
  for await (const _message of execute({
    prompt: "undo",
    options: {
      dangerouslyAllowAll: true,
      cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
      continue: lastThreadId,
    },
  })) {}
};

export const ampAgentHandler: AgentHandler = {
  agentId: "amp",
  run: runAmpAgent,
  abort: abortAmpAgent,
  undo: undoAmpAgent,
};
