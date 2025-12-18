import type {
  AgentProvider,
  AgentContext,
  AgentSession,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import { copyContent, formatElementInfo } from "react-grab/core";

export type { AgentCompleteResult };

const REFERENCE_PREFIX =
  "Use this as reference to make the change, do not actually write this code:\n\n";

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

type UndoAction = () => void;

const createUndoableProxy = (element: HTMLElement) => {
  const undoActions: UndoAction[] = [];
  const record = (action: UndoAction) => undoActions.push(action);

  const removeNodes = (nodes: (Node | string)[]) => {
    for (const node of nodes) {
      if (typeof node !== "string") node.parentNode?.removeChild(node);
    }
  };

  const wrapNodeInsertion = <T extends (...args: (Node | string)[]) => void>(
    method: T,
  ): T =>
    ((...nodes: (Node | string)[]) => {
      method(...nodes);
      record(() => removeNodes(nodes));
    }) as T;

  const styleProxy = new Proxy(element.style, {
    set(target, prop, value) {
      if (typeof prop === "string") {
        const original =
          target.getPropertyValue(prop) ||
          (target as unknown as Record<string, string>)[prop] ||
          "";
        record(() => {
          (target as unknown as Record<string, string>)[prop] = original;
        });
      }
      return Reflect.set(target, prop, value);
    },
  });

  const classListProxy = new Proxy(element.classList, {
    get(target, prop) {
      if (prop === "add")
        return (...classes: string[]) => {
          const toUndo = classes.filter((c) => !target.contains(c));
          record(() => target.remove(...toUndo));
          return target.add(...classes);
        };
      if (prop === "remove")
        return (...classes: string[]) => {
          const toRestore = classes.filter((c) => target.contains(c));
          record(() => target.add(...toRestore));
          return target.remove(...classes);
        };
      if (prop === "toggle")
        return (cls: string, force?: boolean) => {
          const had = target.contains(cls);
          const result = target.toggle(cls, force);
          record(() => (had ? target.add(cls) : target.remove(cls)));
          return result;
        };
      if (prop === "replace")
        return (oldCls: string, newCls: string) => {
          const had = target.contains(oldCls);
          const result = target.replace(oldCls, newCls);
          if (had)
            record(() => {
              target.remove(newCls);
              target.add(oldCls);
            });
          return result;
        };
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  const datasetProxy = new Proxy(element.dataset, {
    set(target, prop, value) {
      if (typeof prop === "string") {
        const original = target[prop];
        const had = prop in target;
        record(() => (had ? (target[prop] = original!) : delete target[prop]));
      }
      return Reflect.set(target, prop, value);
    },
    deleteProperty(target, prop) {
      if (typeof prop === "string" && prop in target) {
        const original = target[prop];
        record(() => {
          target[prop] = original!;
        });
      }
      return Reflect.deleteProperty(target, prop);
    },
  });

  const getMethodHandler = (target: HTMLElement, prop: string) => {
    switch (prop) {
      case "setAttribute":
        return (name: string, value: string) => {
          const had = target.hasAttribute(name);
          const original = target.getAttribute(name);
          record(() =>
            had
              ? target.setAttribute(name, original!)
              : target.removeAttribute(name),
          );
          return target.setAttribute(name, value);
        };
      case "removeAttribute":
        return (name: string) => {
          if (target.hasAttribute(name)) {
            const original = target.getAttribute(name)!;
            record(() => target.setAttribute(name, original));
          }
          return target.removeAttribute(name);
        };
      case "appendChild":
        return (child: Node) => {
          const result = target.appendChild(child);
          record(() => child.parentNode?.removeChild(child));
          return result;
        };
      case "removeChild":
        return (child: Node) => {
          const nextSibling = child.nextSibling;
          const result = target.removeChild(child);
          record(() => target.insertBefore(child, nextSibling));
          return result;
        };
      case "insertBefore":
        return (node: Node, ref: Node | null) => {
          const result = target.insertBefore(node, ref);
          record(() => node.parentNode?.removeChild(node));
          return result;
        };
      case "replaceChild":
        return (newChild: Node, oldChild: Node) => {
          const nextSibling = oldChild.nextSibling;
          const result = target.replaceChild(newChild, oldChild);
          record(() => {
            target.replaceChild(oldChild, newChild);
            if (nextSibling && oldChild.nextSibling !== nextSibling) {
              target.insertBefore(oldChild, nextSibling);
            }
          });
          return result;
        };
      case "remove":
        return () => {
          const parent = target.parentNode;
          const nextSibling = target.nextSibling;
          target.remove();
          record(() => parent?.insertBefore(target, nextSibling));
        };
      case "append":
        return wrapNodeInsertion(target.append.bind(target));
      case "prepend":
        return wrapNodeInsertion(target.prepend.bind(target));
      case "after":
        return wrapNodeInsertion(target.after.bind(target));
      case "before":
        return wrapNodeInsertion(target.before.bind(target));
      case "replaceWith":
        return (...nodes: (Node | string)[]) => {
          const parent = target.parentNode;
          const nextSibling = target.nextSibling;
          target.replaceWith(...nodes);
          record(() => {
            const firstNode = nodes.find((n) => typeof n !== "string") as
              | Node
              | undefined;
            if (parent) {
              parent.insertBefore(target, firstNode ?? nextSibling);
              removeNodes(nodes);
            }
          });
        };
      case "insertAdjacentHTML":
        return (position: InsertPosition, html: string) => {
          const childrenBefore = Array.from(target.childNodes);
          const siblingsBefore = target.parentNode
            ? Array.from(target.parentNode.childNodes)
            : [];
          target.insertAdjacentHTML(position, html);
          const addedChildren = Array.from(target.childNodes).filter(
            (n) => !childrenBefore.includes(n),
          );
          const addedSiblings = target.parentNode
            ? Array.from(target.parentNode.childNodes).filter(
                (n) => !siblingsBefore.includes(n),
              )
            : [];
          record(() =>
            [...addedChildren, ...addedSiblings].forEach((n) =>
              n.parentNode?.removeChild(n),
            ),
          );
        };
      case "insertAdjacentElement":
        return (position: InsertPosition, el: Element) => {
          const result = target.insertAdjacentElement(position, el);
          if (result) record(() => result.parentNode?.removeChild(result));
          return result;
        };
      default:
        return null;
    }
  };

  const handledMethods = new Set([
    "setAttribute",
    "removeAttribute",
    "appendChild",
    "removeChild",
    "insertBefore",
    "replaceChild",
    "remove",
    "append",
    "prepend",
    "after",
    "before",
    "replaceWith",
    "insertAdjacentHTML",
    "insertAdjacentElement",
  ]);

  const proxy = new Proxy(element, {
    get(target, prop) {
      if (prop === "style") return styleProxy;
      if (prop === "classList") return classListProxy;
      if (prop === "dataset") return datasetProxy;
      if (typeof prop === "string" && handledMethods.has(prop)) {
        return getMethodHandler(target, prop);
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (typeof prop === "string") {
        const original = (target as unknown as Record<string, unknown>)[prop];
        record(() => {
          (target as unknown as Record<string, unknown>)[prop] = original;
        });
      }
      return Reflect.set(target, prop, value);
    },
  }) as HTMLElement;

  const undo = () => {
    for (let i = undoActions.length - 1; i >= 0; i--) undoActions[i]();
  };

  return { proxy, undo };
};

const DEFAULT_API_ENDPOINT = "https://www.react-grab.com/api/visual-edit";
const DEFAULT_HEALTHCHECK_ENDPOINT =
  "https://www.react-grab.com/api/check-visual-edit";
const ANCESTOR_LEVELS = 5;

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bdocument\.cookie\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
];

const sanitizeCode = (code: string): string =>
  code
    .replace(/[\u2018\u2019\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u2033\u2036]/g, '"')
    .replace(/[\u2014\u2013\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

const validateCode = (
  code: string,
): { isValid: boolean; error?: string; sanitizedCode: string } => {
  const sanitizedCode = sanitizeCode(code);
  try {
    new Function("$el", sanitizedCode);
  } catch (err) {
    return {
      isValid: false,
      error: `Invalid JavaScript syntax${err instanceof Error ? `: ${err.message}` : ""}`,
      sanitizedCode,
    };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitizedCode)) {
      return {
        isValid: false,
        error: `Potentially unsafe code detected: ${pattern.source}`,
        sanitizedCode,
      };
    }
  }

  return { isValid: true, sanitizedCode };
};

const getOpeningTag = (element: Element): string => {
  const clone = element.cloneNode(false) as Element;
  const wrapper = document.createElement("div");
  wrapper.appendChild(clone);
  const html = wrapper.innerHTML;
  const closingTagMatch = html.match(/<\/[^>]+>$/);
  if (closingTagMatch) {
    return html.slice(0, -closingTagMatch[0].length);
  }
  return html;
};

const getClosingTag = (element: Element): string => {
  return `</${element.tagName.toLowerCase()}>`;
};

const buildAncestorContext = (element: Element): string => {
  const ancestors: Element[] = [];
  let current = element.parentElement;

  for (let level = 0; level < ANCESTOR_LEVELS && current; level++) {
    if (current === document.body || current === document.documentElement) {
      break;
    }
    ancestors.push(current);
    current = current.parentElement;
  }

  if (ancestors.length === 0) {
    return element.outerHTML;
  }

  ancestors.reverse();

  let result = "";
  let indent = "";

  for (const ancestor of ancestors) {
    result += `${indent}${getOpeningTag(ancestor)}\n`;
    indent += "  ";
  }

  result += `${indent}<!-- START $el -->\n`;
  const targetLines = element.outerHTML.split("\n");
  for (const line of targetLines) {
    result += `${indent}${line}\n`;
  }
  result += `${indent}<!-- END $el -->\n`;

  for (
    let ancestorIndex = ancestors.length - 1;
    ancestorIndex >= 0;
    ancestorIndex--
  ) {
    indent = "  ".repeat(ancestorIndex);
    result += `${indent}${getClosingTag(ancestors[ancestorIndex])}\n`;
  }

  return result.trim();
};

export const createVisualEditAgentProvider = (
  options: VisualEditAgentProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const maxIterations = options.maxIterations ?? 3;
  const elementHtmlMap = new Map<string, string>();
  const elementRefMap = new Map<string, Element>();
  const resultCodeMap = new Map<string, string>();
  const undoFnMap = new Map<string, () => void>();
  const conversationHistoryMap = new Map<string, ConversationMessage[]>();
  let lastRequestId: string | null = null;
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
      const result = returnValue !== undefined ? String(returnValue) : null;
      return {
        success: true,
        result,
        updatedHtml: buildAncestorContext(element),
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

      yield "Applying changes…";
    },
    undo: async () => {
      if (!lastRequestId) return;
      const undoFn = undoFnMap.get(lastRequestId);
      if (!undoFn) return;

      try {
        undoFn();
      } finally {
        undoFnMap.delete(lastRequestId);
        lastRequestId = null;
      }
    },
    supportsFollowUp: true,
    dismissButtonText: "Copy",
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

    const { proxy, undo } = createUndoableProxy(element as HTMLElement);
    undoFnMap.set(requestId, undo);
    lastRequestId = requestId;

    try {
      new Function("$el", sanitizedCode).bind(null)(proxy);
    } catch (executionError) {
      undo();
      undoFnMap.delete(requestId);
      lastRequestId = null;
      cleanup(requestId);
      const message =
        executionError instanceof Error
          ? executionError.message
          : "unknown error";
      return { error: `Failed to edit: ${message}` };
    }

    try {
      const elementContext = await formatElementInfo(element);
      const reference = `${REFERENCE_PREFIX}${code}\n\n---\n\n${elementContext}`;
      copyContent(reference);
    } catch {
      // HACK: Non-critical error - edit succeeded but copy failed
    }

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
