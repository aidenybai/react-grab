import type {
  AgentProvider,
  AgentContext,
  AgentSession,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import { copyContent } from "react-grab/core";
import { createUndoableProxy, buildAncestorContext } from "./dom";
import { validateCode } from "./code-validation";
import { buildDiffContext } from "./context";

export type { AgentCompleteResult };

interface VisualEditAgentProviderOptions {
  apiEndpoint?: string;
  maxIterations?: number;
}

interface RequestContext {
  requestId: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface IterationResponse {
  iterate: true;
  code: string;
  reason: string;
}

interface FinalResponse {
  iterate?: false;
  code: string;
}

type AgentResponse = IterationResponse | FinalResponse | string;

const parseAgentResponse = (response: string): AgentResponse => {
  const trimmed = response.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as AgentResponse;
      if (typeof parsed === "object" && "code" in parsed) {
        return parsed;
      }
    } catch {
      // Not valid JSON, treat as raw code
    }
  }
  return trimmed;
};

const buildUserMessage = (
  prompt: string,
  html: string,
  isFirstMessage: boolean,
): string => {
  if (isFirstMessage) {
    return `Here is the HTML to modify:

${html}

Modification request: ${prompt}

You can either:
1. Output ONLY the JavaScript code if you're confident in the change
2. Output JSON to iterate: { "iterate": true, "code": "...", "reason": "why you need to see the result" }

When iterating, the code will be executed and you'll see the updated HTML to refine further.`;
  }

  return `Follow-up modification request: ${prompt}

Remember: Output ONLY the JavaScript code for this modification. The $el variable still references the same element.`;
};

const buildIterationMessage = (
  updatedHtml: string,
  executionResult: string | null,
): string => {
  let message = `Here is the updated HTML after executing your code:

${updatedHtml}`;

  if (executionResult) {
    message += `

Execution result: ${executionResult}`;
  }

  message += `

Continue modifying or output final JavaScript code (without JSON wrapper) when done.`;

  return message;
};

const DEFAULT_API_ENDPOINT = "https://www.react-grab.com/api/visual-edit";
const DEFAULT_HEALTHCHECK_ENDPOINT =
  "https://www.react-grab.com/api/check-visual-edit";

export const createVisualEditAgentProvider = (
  options: VisualEditAgentProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const maxIterations = options.maxIterations ?? 3;
  const elementHtmlMap = new Map<string, string>();
  const elementOuterHtmlMap = new Map<string, string>();
  const elementRefMap = new Map<string, Element>();
  const resultCodeMap = new Map<string, string>();
  const undoFnMap = new Map<string, () => void>();
  const conversationHistoryMap = new Map<string, ConversationMessage[]>();
  const userPromptsMap = new Map<string, string[]>();
  const undoHistory: string[] = [];
  let lastRequestStartTime: number | null = null;

  const getOptions = (): RequestContext => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { requestId };
  };

  const onStart = (session: AgentSession, element: Element | undefined) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId || !element) return;

    const html = buildAncestorContext(element);
    elementHtmlMap.set(requestId, html);
    elementOuterHtmlMap.set(requestId, element.outerHTML);
    elementRefMap.set(requestId, element);
  };

  const fetchWithProgress = async function* (
    messages: ConversationMessage[],
    signal: AbortSignal,
  ): AsyncGenerator<string, string, unknown> {
    let response: Response | null = null;
    let fetchError: Error | null = null;
    const fetchStartTime = Date.now();

    const fetchPromise = fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    })
      .then((fetchResponse) => {
        response = fetchResponse;
      })
      .catch((caughtError) => {
        fetchError = caughtError as Error;
      });

    while (!response && !fetchError) {
      const elapsedSeconds = (Date.now() - fetchStartTime) / 1000;
      yield elapsedSeconds >= 0.1
        ? `Generating… ${elapsedSeconds.toFixed(1)}s`
        : `Generating…`;

      await Promise.race([
        fetchPromise,
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
    }

    if (fetchError) {
      throw fetchError;
    }

    if (!response!.ok) {
      const errorText = await response!.text().catch(() => "Unknown error");
      let errorMessage = errorText;
      try {
        const parsed = JSON.parse(errorText) as { error?: unknown };
        if (parsed.error) {
          errorMessage =
            typeof parsed.error === "string"
              ? parsed.error
              : JSON.stringify(parsed.error);
        }
      } catch {
        // HACK: Not JSON, use raw text
      }
      throw new Error(errorMessage);
    }

    yield await response!.text();
    return "";
  };

  const executeIterationCode = (
    element: Element,
    code: string,
  ): {
    success: boolean;
    result: string | null;
    updatedHtml: string;
    undo: () => void;
  } => {
    const { isValid, error, sanitizedCode } = validateCode(code);
    if (!isValid) {
      return {
        success: false,
        result: error ?? "Invalid code",
        updatedHtml: buildAncestorContext(element),
        undo: () => {},
      };
    }

    const { proxy, undo } = createUndoableProxy(element as HTMLElement);

    try {
      const returnValue = new Function("$el", sanitizedCode).bind(null)(proxy);
      const executionResult =
        returnValue !== undefined ? String(returnValue) : null;
      const isStillInDom = document.contains(element);

      return {
        success: true,
        result: executionResult,
        updatedHtml: isStillInDom ? buildAncestorContext(element) : "",
        undo,
      };
    } catch (executionError) {
      undo();
      const errorMessage =
        executionError instanceof Error
          ? executionError.message
          : "Execution failed";
      return {
        success: false,
        result: errorMessage,
        updatedHtml: buildAncestorContext(element),
        undo: () => {},
      };
    }
  };

  const provider: AgentProvider<RequestContext> = {
    send: async function* (
      context: AgentContext<RequestContext>,
      signal: AbortSignal,
    ) {
      const requestId = context.options?.requestId ?? "";
      const sessionId = context.sessionId;
      const html = elementHtmlMap.get(requestId);
      const element = elementRefMap.get(requestId);

      if (!html || !element) {
        throw new Error("Could not capture element HTML");
      }

      const existingMessages = sessionId
        ? (conversationHistoryMap.get(sessionId) ?? [])
        : [];

      const isFirstMessage = existingMessages.length === 0;
      const formattedUserMessage = buildUserMessage(
        context.prompt,
        html,
        isFirstMessage,
      );

      const existingPrompts = sessionId
        ? (userPromptsMap.get(sessionId) ?? [])
        : [];
      const updatedPrompts = [...existingPrompts, context.prompt];

      const messages: ConversationMessage[] = [
        ...existingMessages,
        { role: "user", content: formattedUserMessage },
      ];

      lastRequestStartTime = Date.now();
      let iterationCount = 0;
      let finalCode: string | null = null;
      const iterationUndos: (() => void)[] = [];

      while (iterationCount <= maxIterations) {
        let responseText = "";
        for await (const progress of fetchWithProgress(messages, signal)) {
          if (typeof progress === "string" && !progress.startsWith("{")) {
            yield progress;
          }
          responseText = progress;
        }

        const parsedResponse = parseAgentResponse(responseText);

        if (typeof parsedResponse === "string") {
          finalCode = parsedResponse;
          messages.push({ role: "assistant", content: responseText });
          break;
        }

        if (!parsedResponse.iterate) {
          finalCode = parsedResponse.code;
          messages.push({ role: "assistant", content: responseText });
          break;
        }

        messages.push({ role: "assistant", content: responseText });

        yield `Applying…`;

        const { success, result, updatedHtml, undo } = executeIterationCode(
          element,
          parsedResponse.code,
        );

        iterationUndos.push(undo);

        const iterationFeedback = buildIterationMessage(
          updatedHtml,
          success ? result : `Error: ${result}`,
        );

        messages.push({ role: "user", content: iterationFeedback });
        iterationCount++;
      }

      // HACK: Undo all iteration changes before applying final code with proper undo tracking
      for (
        let undoIndex = iterationUndos.length - 1;
        undoIndex >= 0;
        undoIndex--
      ) {
        iterationUndos[undoIndex]();
      }

      if (finalCode === null) {
        throw new Error("Max iterations reached without final code");
      }

      resultCodeMap.set(requestId, finalCode);

      conversationHistoryMap.set(sessionId ?? requestId, messages);
      userPromptsMap.set(sessionId ?? requestId, updatedPrompts);

      yield "Applying changes…";
    },
    undo: async () => {
      const requestIdToUndo = undoHistory.pop();
      if (!requestIdToUndo) return;

      const undoFn = undoFnMap.get(requestIdToUndo);
      if (!undoFn) return;

      try {
        undoFn();
      } finally {
        undoFnMap.delete(requestIdToUndo);
      }
    },
    supportsFollowUp: true,
    dismissButtonText: "Accept",
    getCompletionMessage: () => {
      if (lastRequestStartTime === null) return undefined;
      const totalSeconds = ((Date.now() - lastRequestStartTime) / 1000).toFixed(
        1,
      );
      return `Completed in ${totalSeconds}s`;
    },
  };

  const cleanup = (requestId: string) => {
    elementHtmlMap.delete(requestId);
    elementOuterHtmlMap.delete(requestId);
    elementRefMap.delete(requestId);
    resultCodeMap.delete(requestId);
  };

  const onComplete = async (
    session: AgentSession,
    element: Element | undefined,
  ): Promise<AgentCompleteResult | void> => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const rawCode = resultCodeMap.get(requestId);
    if (!rawCode) return;
    const code = rawCode.trim();

    if (!element) {
      cleanup(requestId);
      return { error: "Failed to edit: element not found" };
    }

    if (code === "") {
      cleanup(requestId);
      return { error: "Failed to edit: no changes generated" };
    }

    const { isValid, error, sanitizedCode } = validateCode(code);
    if (!isValid) {
      cleanup(requestId);
      return { error: `Failed to edit: ${error ?? "invalid code"}` };
    }

    const originalOuterHtml = elementOuterHtmlMap.get(requestId) ?? "";

    const { proxy, undo } = createUndoableProxy(element as HTMLElement);

    try {
      new Function("$el", sanitizedCode).bind(null)(proxy);
    } catch (executionError) {
      undo();
      cleanup(requestId);
      const errorMessage =
        executionError instanceof Error
          ? executionError.message
          : "unknown error";
      return { error: `Failed to edit: ${errorMessage}` };
    }

    undoFnMap.set(requestId, undo);
    undoHistory.push(requestId);

    const sessionId = session.id;
    const userPrompts = userPromptsMap.get(sessionId) ?? [];
    const diffContext = await buildDiffContext(
      element,
      originalOuterHtml,
      userPrompts,
    );
    copyContent(diffContext);

    cleanup(requestId);
  };

  const onUndo = () => {
    // HACK: Undo logic is handled by provider.undo, this callback is for session restoration in core.tsx
  };

  return { provider, getOptions, onStart, onComplete, onUndo };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setAgent" in value;

const checkHealth = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(DEFAULT_HEALTHCHECK_ENDPOINT, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return data?.healthy === true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
};

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const isHealthy = await checkHealth();
  if (!isHealthy) return;

  const { provider, getOptions, onStart, onComplete, onUndo } =
    createVisualEditAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setAgent({
      provider,
      getOptions,
      onStart,
      onComplete,
      onUndo,
    });
  };

  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    attach(existingApi);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      attach(event.detail);
    },
    { once: true },
  );

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
