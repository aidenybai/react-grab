import type { AgentProvider, AgentContext, AgentSession } from "react-grab";

interface InstantApplyAgentProviderOptions {
  apiEndpoint?: string;
}

interface RequestContext {
  requestId: string;
}

const DEFAULT_API_ENDPOINT = "/api/instant-apply";
const ANCESTOR_LEVELS = 5;

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

  for (let ancestorIndex = ancestors.length - 1; ancestorIndex >= 0; ancestorIndex--) {
    indent = "  ".repeat(ancestorIndex);
    result += `${indent}${getClosingTag(ancestors[ancestorIndex])}\n`;
  }

  return result.trim();
};

export const createInstantApplyAgentProvider = (
  options: InstantApplyAgentProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const elementHtmlMap = new Map<string, string>();
  const resultCodeMap = new Map<string, string>();
  let lastRequestStartTime: number | null = null;

  const getOptions = (): RequestContext => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { requestId };
  };

  const onStart = (session: AgentSession, element: Element | undefined) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId || !element) return;

    elementHtmlMap.set(requestId, buildAncestorContext(element));
  };

  const provider: AgentProvider<RequestContext> = {
    send: async function* (
      context: AgentContext<RequestContext>,
      signal: AbortSignal,
    ) {
      const requestId = context.options?.requestId ?? "";
      const html = elementHtmlMap.get(requestId);

      if (!html) {
        throw new Error("Could not capture element HTML");
      }

      lastRequestStartTime = Date.now();
      let response: Response | null = null;
      let fetchError: Error | null = null;

      const fetchPromise = fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: context.prompt,
          html,
        }),
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
        yield elapsedSeconds >= 0.1 ? `Generating… ${elapsedSeconds.toFixed(1)}s` : "Generating…";

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

      yield "Applying changes...";
    },
    getCompletionMessage: () => {
      if (lastRequestStartTime === null) return undefined;
      const totalSeconds = ((Date.now() - lastRequestStartTime) / 1000).toFixed(1);
      return `Completed in ${totalSeconds}s`;
    },
  };

  const onComplete = (session: AgentSession, element: Element | undefined) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const code = resultCodeMap.get(requestId);
    if (!code) return;

    if (!element) {
      console.warn("[react-grab] Could not find element to apply changes");
      elementHtmlMap.delete(requestId);
      resultCodeMap.delete(requestId);
      return;
    }

    new Function('$el', code).bind(null)(element);

    elementHtmlMap.delete(requestId);
    resultCodeMap.delete(requestId);
  };

  return { provider, getOptions, onStart, onComplete };
};
