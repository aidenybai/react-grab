import type {
  AgentProvider,
  AgentContext,
  AgentSession,
  AgentCompleteResult,
  ReactGrabAPI,
} from "../core/index.js";
import { copyContent } from "../core/index.js";
import { createUndoableProxy, buildAncestorContext } from "./dom.js";
import { validateCode } from "./code-validation.js";
import { buildDiffContext } from "./context.js";

export type { AgentCompleteResult };

interface VisualEditProviderOptions {
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

interface AgentResponse {
  iterate?: boolean;
  code: string;
  reason?: string;
}

const parseAgentResponse = (response: string): AgentResponse | string => {
  const trimmed = response.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "code" in parsed &&
        typeof (parsed as AgentResponse).code === "string"
      ) {
        return parsed as AgentResponse;
      }
    } catch {
      // HACK: fall through if JSON parsing fails
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
  options: VisualEditProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const maxIterations = options.maxIterations ?? 3;
  const elementHtmlListMap = new Map<string, string[]>();
  const elementOuterHtmlListMap = new Map<string, string[]>();
  const elementRefsMap = new Map<string, Element[]>();
  const resultCodeMap = new Map<string, string>();
  const undoFnMap = new Map<string, () => void>();
  const conversationHistoryMap = new Map<string, ConversationMessage[]>();
  const userPromptsMap = new Map<string, string[]>();
  const sessionOriginalHtmlMap = new Map<string, string[]>();
  const undoHistory: string[] = [];
  const redoHistory: string[] = [];

  interface UndoableEntry {
    code: string;
    elements: Element[];
  }
  const undoableCodeMap = new Map<string, UndoableEntry>();

  let lastRequestStartTime: number | null = null;

  const getOptions = (): RequestContext => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { requestId };
  };

  const onStart = (session: AgentSession, elements: Element[]) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId || elements.length === 0) return;

    const htmlList = elements.map((el) => buildAncestorContext(el));
    const outerHtmlList = elements.map((el) => el.outerHTML);

    elementHtmlListMap.set(requestId, htmlList);
    elementOuterHtmlListMap.set(requestId, outerHtmlList);
    elementRefsMap.set(requestId, elements);

    const sessionId = session.id;
    if (sessionId && !sessionOriginalHtmlMap.has(sessionId)) {
      sessionOriginalHtmlMap.set(sessionId, outerHtmlList);
    }
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

    if (fetchError !== null) {
      throw new Error((fetchError as Error).message);
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
    elementRemoved: boolean;
  } => {
    if (!document.contains(element)) {
      return {
        success: false,
        result: "Element was removed from DOM",
        updatedHtml: "",
        undo: () => {},
        elementRemoved: true,
      };
    }

    const { isValid, error, sanitizedCode } = validateCode(code);
    if (!isValid) {
      return {
        success: false,
        result: error ?? "Invalid code",
        updatedHtml: buildAncestorContext(element),
        undo: () => {},
        elementRemoved: false,
      };
    }

    const { proxy, undo } = createUndoableProxy(element as HTMLElement);

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const executor = new Function("$el", sanitizedCode) as (
        el: HTMLElement,
      ) => unknown;
      const returnValue = executor.call(null, proxy);
      let executionResult: string | null = null;
      if (returnValue !== undefined && returnValue !== null) {
        if (typeof returnValue === "object") {
          executionResult = JSON.stringify(returnValue);
        } else if (typeof returnValue === "string") {
          executionResult = returnValue;
        } else if (
          typeof returnValue === "number" ||
          typeof returnValue === "boolean"
        ) {
          executionResult = String(returnValue);
        }
      }
      const isStillInDom = document.contains(element);

      return {
        success: true,
        result: executionResult,
        updatedHtml: isStillInDom ? buildAncestorContext(element) : "",
        undo,
        elementRemoved: !isStillInDom,
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
        elementRemoved: false,
      };
    }
  };

  const processElement = async function* (
    element: Element,
    html: string,
    prompt: string,
    sessionId: string | undefined,
    requestId: string,
    signal: AbortSignal,
    elementIndex: number,
    totalElements: number,
    isFirstRequest: boolean,
  ): AsyncGenerator<string, string | null, unknown> {
    const existingMessages =
      sessionId && !isFirstRequest
        ? (conversationHistoryMap.get(sessionId) ?? [])
        : [];

    const isFirstMessage = existingMessages.length === 0;
    const formattedUserMessage = buildUserMessage(prompt, html, isFirstMessage);

    const messages: ConversationMessage[] = [
      ...existingMessages,
      { role: "user", content: formattedUserMessage },
    ];

    let iterationCount = 0;
    let finalCode: string | null = null;
    const iterationUndos: (() => void)[] = [];

    while (iterationCount <= maxIterations) {
      let responseText = "";
      for await (const progress of fetchWithProgress(messages, signal)) {
        if (typeof progress === "string" && !progress.startsWith("{")) {
          const prefix =
            totalElements > 1 ? `[${elementIndex + 1}/${totalElements}] ` : "";
          yield `${prefix}${progress}`;
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

      const prefix =
        totalElements > 1 ? `[${elementIndex + 1}/${totalElements}] ` : "";
      yield `${prefix}Applying…`;

      const { success, result, updatedHtml, undo, elementRemoved } =
        executeIterationCode(element, parsedResponse.code);

      iterationUndos.push(undo);

      if (elementRemoved) {
        for (
          let undoIndex = iterationUndos.length - 1;
          undoIndex >= 0;
          undoIndex--
        ) {
          iterationUndos[undoIndex]();
        }
        throw new Error(
          "Element was removed from the page during editing. This can happen if the page re-rendered.",
        );
      }

      const iterationFeedback = buildIterationMessage(
        updatedHtml,
        success ? result : `Error: ${result}`,
      );

      messages.push({ role: "user", content: iterationFeedback });
      iterationCount++;
    }

    for (
      let undoIndex = iterationUndos.length - 1;
      undoIndex >= 0;
      undoIndex--
    ) {
      iterationUndos[undoIndex]();
    }

    conversationHistoryMap.set(sessionId ?? requestId, messages);

    return finalCode;
  };

  const provider: AgentProvider<RequestContext> = {
    send: async function* (
      context: AgentContext<RequestContext>,
      signal: AbortSignal,
    ) {
      const requestId = context.options?.requestId ?? "";
      const sessionId = context.sessionId;
      const htmlList = elementHtmlListMap.get(requestId);
      const elements = elementRefsMap.get(requestId);

      if (!htmlList || !elements || elements.length === 0) {
        throw new Error("Could not capture element HTML");
      }

      for (const element of elements) {
        if (!document.contains(element)) {
          throw new Error(
            "Element was removed from the page. This can happen if the page re-rendered.",
          );
        }
      }

      const existingPrompts = sessionId
        ? (userPromptsMap.get(sessionId) ?? [])
        : [];
      const isFirstRequest = existingPrompts.length === 0;
      const updatedPrompts = [...existingPrompts, context.prompt];

      lastRequestStartTime = Date.now();
      const finalCodes: string[] = [];

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const html = htmlList[i];

        if (elements.length > 1) {
          yield `Processing element ${i + 1} of ${elements.length}...`;
        }

        const finalCode = yield* processElement(
          element,
          html,
          context.prompt,
          sessionId,
          requestId,
          signal,
          i,
          elements.length,
          isFirstRequest,
        );

        if (finalCode === null) {
          throw new Error(
            `Max iterations reached without final code for element ${i + 1}`,
          );
        }

        finalCodes.push(finalCode);
      }

      resultCodeMap.set(requestId, JSON.stringify(finalCodes));
      userPromptsMap.set(sessionId ?? requestId, updatedPrompts);

      yield "Applying changes…";
    },
    undo: async () => {
      await Promise.resolve();
      const requestIdToUndo = undoHistory.pop();
      if (!requestIdToUndo) return;

      const undoFn = undoFnMap.get(requestIdToUndo);
      if (!undoFn) return;

      try {
        undoFn();
        redoHistory.push(requestIdToUndo);
      } finally {
        undoFnMap.delete(requestIdToUndo);
      }
    },
    canUndo: () => undoHistory.length > 0,
    redo: async () => {
      await Promise.resolve();
      const requestIdToRedo = redoHistory.pop();
      if (!requestIdToRedo) return;

      const entry = undoableCodeMap.get(requestIdToRedo);
      if (!entry) return;

      const { code, elements: entryElements } = entry;
      const codes = JSON.parse(code) as string[];
      const undoFns: (() => void)[] = [];

      for (let elementIndex = 0; elementIndex < entryElements.length; elementIndex++) {
        const element = entryElements[elementIndex];
        const elementCode = codes[elementIndex];
        if (!document.contains(element) || !elementCode) continue;

        const { proxy, undo } = createUndoableProxy(element as HTMLElement);

        try {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          const executor = new Function("$el", elementCode) as (
            el: HTMLElement,
          ) => unknown;
          executor.call(null, proxy);
          undoFns.push(undo);
        } catch {
          undo();
        }
      }

      if (undoFns.length > 0) {
        undoFnMap.set(requestIdToRedo, () => {
          for (let undoIndex = undoFns.length - 1; undoIndex >= 0; undoIndex--) {
            undoFns[undoIndex]();
          }
        });
        undoHistory.push(requestIdToRedo);
      }
    },
    canRedo: () => redoHistory.length > 0,
    supportsFollowUp: true,
    dismissButtonText: "Keep",
    getCompletionMessage: () => {
      if (lastRequestStartTime === null) return undefined;
      const totalSeconds = ((Date.now() - lastRequestStartTime) / 1000).toFixed(
        1,
      );
      return `Completed in ${totalSeconds}s`;
    },
  };

  const cleanup = (requestId: string) => {
    elementHtmlListMap.delete(requestId);
    elementOuterHtmlListMap.delete(requestId);
    elementRefsMap.delete(requestId);
    resultCodeMap.delete(requestId);
  };

  const onComplete = async (
    session: AgentSession,
    elements: Element[],
  ): Promise<AgentCompleteResult | void> => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const rawCodes = resultCodeMap.get(requestId);
    if (!rawCodes) return;

    let codes: string[];
    try {
      codes = JSON.parse(rawCodes) as string[];
    } catch {
      cleanup(requestId);
      return { error: "Failed to edit: invalid code format" };
    }

    if (elements.length === 0) {
      cleanup(requestId);
      return { error: "Failed to edit: no elements found" };
    }

    for (const element of elements) {
      if (!document.contains(element)) {
        cleanup(requestId);
        return {
          error:
            "Failed to edit: element was removed from the page. This can happen if the page re-rendered.",
        };
      }
    }

    const sessionId = session.id;
    const originalOuterHtmlList =
      (sessionId ? sessionOriginalHtmlMap.get(sessionId) : null) ??
      elementOuterHtmlListMap.get(requestId) ??
      [];

    const undoFns: (() => void)[] = [];
    const sanitizedCodes: string[] = [];
    const processedElements: Element[] = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const code = codes[i]?.trim() ?? "";

      if (code === "") {
        continue;
      }

      const { isValid, error, sanitizedCode } = validateCode(code);
      if (!isValid) {
        for (let j = undoFns.length - 1; j >= 0; j--) {
          undoFns[j]();
        }
        cleanup(requestId);
        return {
          error: `Failed to edit element ${i + 1}: ${error ?? "invalid code"}`,
        };
      }

      const { proxy, undo } = createUndoableProxy(element as HTMLElement);

      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const executor = new Function("$el", sanitizedCode) as (
          el: HTMLElement,
        ) => unknown;
        executor.call(null, proxy);
        undoFns.push(undo);
        sanitizedCodes.push(sanitizedCode);
        processedElements.push(element);
      } catch (executionError) {
        undo();
        for (let j = undoFns.length - 1; j >= 0; j--) {
          undoFns[j]();
        }
        cleanup(requestId);
        const errorMessage =
          executionError instanceof Error
            ? executionError.message
            : "Execution failed";
        return { error: `Failed to edit element ${i + 1}: ${errorMessage}` };
      }
    }

    const combinedUndo = () => {
      for (let i = undoFns.length - 1; i >= 0; i--) {
        undoFns[i]();
      }
    };

    undoFnMap.set(requestId, combinedUndo);
    undoHistory.push(requestId);
    undoableCodeMap.set(requestId, {
      code: JSON.stringify(sanitizedCodes),
      elements: processedElements,
    });
    redoHistory.length = 0;

    const userPrompts = userPromptsMap.get(sessionId ?? requestId) ?? [];
    const firstElement = elements[0];
    const firstOriginalHtml = originalOuterHtmlList[0] ?? "";
    const diffContext = await buildDiffContext(
      firstElement,
      firstOriginalHtml,
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

    const data = (await response.json().catch(() => null)) as {
      healthy?: boolean;
    } | null;
    return data?.healthy === true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
};

export const initVisualEdit = async (
  api: ReactGrabAPI,
  options?: VisualEditProviderOptions,
): Promise<void> => {
  try {
    const isHealthy = await checkHealth();
    if (!isHealthy) return; // Silent degradation

    const { provider, getOptions, onStart, onComplete, onUndo } =
      createVisualEditAgentProvider(options);

    api.setAgent({
      provider,
      getOptions,
      onStart,
      onComplete,
      onUndo,
    });
  } catch (error) {
    console.error("[react-grab] Failed to initialize visual-edit:", error);
  }
};
