import type {
  AgentProvider,
  AgentContext,
  AgentSession,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";

export type { AgentCompleteResult };

interface InstantAgentProviderOptions {
  apiEndpoint?: string;
}

interface RequestContext {
  requestId: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const buildUserMessage = (
  prompt: string,
  html: string,
  isFirstMessage: boolean,
): string => {
  if (isFirstMessage) {
    return `Here is the HTML to modify:

${html}

Modification request: ${prompt}

Remember: Output ONLY the JavaScript code, nothing else.`;
  }

  return `Follow-up modification request: ${prompt}

Remember: Output ONLY the JavaScript code for this modification. The $el variable still references the same element.`;
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

const DEFAULT_API_ENDPOINT = "https://www.react-grab.com/api/instant";
const ANCESTOR_LEVELS = 5;

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bdocument\.cookie\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
];

const validateCode = (code: string): { isValid: boolean; error?: string } => {
  try {
    new Function("$el", code);
  } catch (err) {
    return { isValid: false, error: `Invalid JavaScript syntax${err instanceof Error ? `: ${err.message}` : ""}` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return {
        isValid: false,
        error: `Potentially unsafe code detected: ${pattern.source}`,
      };
    }
  }

  return { isValid: true };
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

export const createInstantAgentProvider = (
  options: InstantAgentProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const elementHtmlMap = new Map<string, string>();
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
  };

  const provider: AgentProvider<RequestContext> = {
    send: async function* (
      context: AgentContext<RequestContext>,
      signal: AbortSignal,
    ) {
      const requestId = context.options?.requestId ?? "";
      const sessionId = context.sessionId;
      const html = elementHtmlMap.get(requestId);

      if (!html) {
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
      let response: Response | null = null;
      let fetchError: Error | null = null;

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
        const elapsedSeconds = (Date.now() - lastRequestStartTime) / 1000;
        yield elapsedSeconds >= 0.1
          ? `Generating… ${elapsedSeconds.toFixed(1)}s`
          : "Generating…";

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
        throw new Error(`API error: ${response!.status} - ${errorText}`);
      }

      const code = await response!.text();
      resultCodeMap.set(requestId, code);

      conversationHistoryMap.set(sessionId ?? requestId, [
        ...messages,
        { role: "assistant", content: code },
      ]);

      yield "Applying changes…";
    },
    supportsFollowUp: true,
    getCompletionMessage: () => {
      if (lastRequestStartTime === null) return undefined;
      const totalSeconds = ((Date.now() - lastRequestStartTime) / 1000).toFixed(
        1,
      );
      return `Completed in ${totalSeconds}s`;
    },
  };

  const onComplete = (
    session: AgentSession,
    element: Element | undefined,
  ): AgentCompleteResult | void => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const rawCode = resultCodeMap.get(requestId);
    if (!rawCode) return;
    const code = rawCode.trim();

    if (!element) {
      elementHtmlMap.delete(requestId);
      resultCodeMap.delete(requestId);
      return { error: "Could not find element to apply changes" };
    }

    if (code === "") {
      elementHtmlMap.delete(requestId);
      resultCodeMap.delete(requestId);
      return { error: "No changes generated" };
    }

    const validation = validateCode(code);
    if (!validation.isValid) {
      elementHtmlMap.delete(requestId);
      resultCodeMap.delete(requestId);
      return { error: validation.error ?? "No changes generated" };
    }

    const { proxy, undo } = createUndoableProxy(element as HTMLElement);
    undoFnMap.set(requestId, undo);
    lastRequestId = requestId;

    try {
      new Function("$el", code).bind(null)(proxy);
    } catch (executionError) {
      undo();
      undoFnMap.delete(requestId);
      lastRequestId = null;
      elementHtmlMap.delete(requestId);
      resultCodeMap.delete(requestId);
      const message =
        executionError instanceof Error
          ? executionError.message
          : "Code execution failed";
      return { error: message };
    }

    elementHtmlMap.delete(requestId);
    resultCodeMap.delete(requestId);
  };

  const onUndo = () => {
    if (!lastRequestId) return;
    const undoFn = undoFnMap.get(lastRequestId);
    if (!undoFn) return;

    undoFn();
    undoFnMap.delete(lastRequestId);
    lastRequestId = null;
  };

  return { provider, getOptions, onStart, onComplete, onUndo };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const { provider, getOptions, onStart, onComplete, onUndo } =
    createInstantAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setAgent({
      provider,
      getOptions,
      onStart,
      onComplete,
      onUndo,
    });
  };

  const api = window.__REACT_GRAB__;
  if (api) {
    attach(api);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      const customEvent = event as CustomEvent<ReactGrabAPI>;
      attach(customEvent.detail);
    },
    { once: true },
  );

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (apiAfterListener) {
    attach(apiAfterListener);
  }
};

attachAgent();
