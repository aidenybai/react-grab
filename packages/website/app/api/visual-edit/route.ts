import { generateText } from "ai";
import type { ModelMessage } from "ai";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface RateLimitDecision {
  isAllowed: boolean;
  retryAfterSeconds: number;
}

const SYSTEM_PROMPT = `You are a DOM manipulation assistant. You will receive HTML with ancestor context and a modification request.

The HTML shows the target element nested within its ancestor elements (up to 5 levels). The target element is marked with <!-- START $el --> and <!-- END $el --> comments. The ancestor tags are shown for structural context only - you should only modify the target element between these markers.

CRITICAL RULES:
1. Output ONLY JavaScript code - nothing else
2. Do NOT wrap output in markdown code fences
3. Start with a single-line comment explaining what the code does (e.g. "// Changes button text to show loading state")
4. Use $el to reference the target element (marked between <!-- START $el --> and <!-- END $el -->)
5. Modify the element using standard DOM APIs
6. Do NOT reassign $el itself
7. ITERATION IS RARE - try hard to solve the request completely in one response.
8. If you need custom CSS (including animations/keyframes), inject a <style> tag into the document head - do not assume any styles or animations are pre-defined.
9. ANIMATIONS: No CSS animations or keyframes exist by default. Use the Web Animations API (element.animate()) or inject <style> tags to create them.

Example output (with animation):
// Adds a pulse animation to the element
const styleId = 'pulse-animation';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }';
  document.head.appendChild(style);
}
$el.style.animation = 'pulse 2s infinite';

Example output:
// Changes button text to loading state
$el.textContent = "Loading..."

Example output:
// Adds highlight class to element
$el.classList.add("highlighted")

Your response must be raw JavaScript that can be directly eval'd.`;

const RATE_LIMIT_WINDOW_MS = 60_000;
const lastRequestTimestampByClientKey = new Map<string, number>();

const parseHostnameFromOrigin = (origin: string): string | null => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

const isReactGrabHostname = (hostname: string): boolean => {
  return hostname === "react-grab.com" || hostname === "www.react-grab.com";
};

const isReactGrabVercelHostname = (hostname: string): boolean => {
  return hostname.endsWith(".vercel.app") && hostname.startsWith("react-grab");
};

const isReactGrabOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  const hostname = parseHostnameFromOrigin(origin);
  if (!hostname) return false;

  if (isReactGrabHostname(hostname)) return true;
  if (isReactGrabVercelHostname(hostname)) return true;

  return false;
};

const getClientIpAddress = (headers: Headers): string | null => {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwardedFor = forwardedFor.split(",")[0]?.trim();
    if (firstForwardedFor) return firstForwardedFor;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const connectingIp = headers.get("cf-connecting-ip");
  if (connectingIp) return connectingIp.trim();

  return null;
};

const getClientRateLimitKey = (request: Request): string => {
  const origin = request.headers.get("origin") ?? "unknown-origin";
  const clientIpAddress = getClientIpAddress(request.headers) ?? "unknown-ip";
  return `${clientIpAddress}::${origin}`;
};

const decideRateLimit = (request: Request): RateLimitDecision => {
  const now = Date.now();
  const clientKey = getClientRateLimitKey(request);
  const lastRequestTimestamp = lastRequestTimestampByClientKey.get(clientKey);

  if (!lastRequestTimestamp) {
    lastRequestTimestampByClientKey.set(clientKey, now);
    return { isAllowed: true, retryAfterSeconds: 0 };
  }

  const elapsedMs = now - lastRequestTimestamp;
  if (elapsedMs >= RATE_LIMIT_WINDOW_MS) {
    lastRequestTimestampByClientKey.set(clientKey, now);
    return { isAllowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((RATE_LIMIT_WINDOW_MS - elapsedMs) / 1000),
  );

  return { isAllowed: false, retryAfterSeconds };
};

const getCorsHeaders = (origin: string | null) => {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
};

interface OpenCodeZenResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const generateTextWithOpenCodeZen = async (
  systemPrompt: string,
  messages: ModelMessage[],
): Promise<string> => {
  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCODE_ZEN_API_KEY not configured");
  }

  const response = await fetch("https://api.opencode.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-fast",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenCode Zen API error: ${response.status} ${errorText}`);
  }

  const data: OpenCodeZenResponse = await response.json();
  return data.choices[0]?.message?.content ?? "";
};

export const POST = async (request: Request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const shouldUsePrimaryModel = isReactGrabOrigin(origin);

  const rateLimitDecision = decideRateLimit(request);
  if (!rateLimitDecision.isAllowed) {
    return new Response(
      JSON.stringify({ error: "Please retry in a bit" }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitDecision.retryAfterSeconds),
        },
      },
    );
  }

  let body: { messages: ConversationMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages } = body;

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const conversationMessages: ModelMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  try {
    let generatedCode: string;

    if (shouldUsePrimaryModel) {
      const apiKey = process.env.AI_GATEWAY_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "AI_GATEWAY_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await generateText({
        model: "cerebras/glm-4.6",
        system: SYSTEM_PROMPT,
        messages: conversationMessages,
      });
      generatedCode = result.text;
    } else {
      generatedCode = await generateTextWithOpenCodeZen(
        SYSTEM_PROMPT,
        conversationMessages,
      );
    }

    return new Response(generatedCode, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/javascript",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

const IS_HEALTHY = true;

export const OPTIONS = (request: Request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET = (request: Request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return Response.json(
    { healthy: IS_HEALTHY },
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};
