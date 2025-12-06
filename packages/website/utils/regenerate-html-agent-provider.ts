import type { AgentProvider, AgentContext, AgentSession } from "react-grab";

interface RegenerateHtmlAgentProviderOptions {
  apiEndpoint?: string;
}

interface RequestContext {
  requestId: string;
}

const DEFAULT_API_ENDPOINT = "/api/regenerate-html";

export const createRegenerateHtmlAgentProvider = (
  options: RegenerateHtmlAgentProviderOptions = {},
) => {
  const apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
  const elementHtmlMap = new Map<string, string>();
  const resultHtmlMap = new Map<string, string>();

  const getOptions = (): RequestContext => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { requestId };
  };

  const onStart = (session: AgentSession, element: Element | undefined) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId || !element) return;

    elementHtmlMap.set(requestId, element.outerHTML);
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

      yield "Generating…";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: context.prompt,
          html,
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const newHtml = await response.text();
      resultHtmlMap.set(requestId, newHtml);

      yield "Applying changes...";
    },
  };

  const onComplete = (session: AgentSession, element: Element | undefined) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const html = resultHtmlMap.get(requestId);
    if (!html) return;

    if (!element) {
      console.warn("[react-grab] Could not find element to apply HTML changes");
      elementHtmlMap.delete(requestId);
      resultHtmlMap.delete(requestId);
      return;
    }

    element.outerHTML = html;

    elementHtmlMap.delete(requestId);
    resultHtmlMap.delete(requestId);
  };

  return { provider, getOptions, onStart, onComplete };
};
