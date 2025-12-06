import type { AgentProvider, AgentContext, AgentSession } from "react-grab";

interface RegenerateHtmlAgentProviderOptions {
  apiEndpoint?: string;
}

interface RequestContext {
  requestId: string;
}

const DEFAULT_API_ENDPOINT = "/api/regenerate-html";

const findElementByBounds = (session: AgentSession): Element | null => {
  const { selectionBounds, tagName } = session;
  if (!selectionBounds || !tagName) return null;

  const candidates = Array.from(document.querySelectorAll(tagName));
  let bestMatch: Element | null = null;
  let bestDistance = Infinity;

  const targetCenterX = selectionBounds.x + selectionBounds.width / 2;
  const targetCenterY = selectionBounds.y + selectionBounds.height / 2;

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();

    const widthDiff = Math.abs(rect.width - selectionBounds.width);
    const heightDiff = Math.abs(rect.height - selectionBounds.height);
    if (widthDiff > 5 || heightDiff > 5) continue;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(centerX - targetCenterX, centerY - targetCenterY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestDistance < 50 ? bestMatch : null;
};

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

  const onStart = (session: AgentSession) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const element = findElementByBounds(session);
    if (element) {
      elementHtmlMap.set(requestId, element.outerHTML);
    }
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

      yield "Regenerating HTML...";

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

  const onComplete = (session: AgentSession) => {
    const requestId = (session.context.options as RequestContext | undefined)
      ?.requestId;
    if (!requestId) return;

    const html = resultHtmlMap.get(requestId);
    if (!html) return;

    const element = findElementByBounds(session);
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
