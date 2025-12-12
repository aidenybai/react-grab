import { kv } from "@vercel/kv";
import { checkBotId } from "botid/server";

const OPENCODE_ZEN_ENDPOINT = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "grok-code";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_PREFIX = "visual-edit:";

const generateCacheKey = async (messages: ConversationMessage[]): Promise<string> => {
  const content = JSON.stringify(messages);
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${CACHE_PREFIX}${hash}`;
};

const SYSTEM_PROMPT = `You are a DOM manipulation assistant. You will receive HTML with ancestor context and a modification request.

The HTML shows the target element nested within its ancestor elements (up to 5 levels). The target element is marked with <!-- START $el --> and <!-- END $el --> comments. The ancestor tags are shown for structural context only - you should only modify the target element between these markers.

CRITICAL RULES:
1. Output ONLY JavaScript code - nothing else
2. Do NOT wrap output in markdown code fences
3. Do NOT include any explanations, comments, or preamble
4. Use $el to reference the target element (marked between <!-- START $el --> and <!-- END $el -->)
5. Modify the element using standard DOM APIs
6. Do NOT reassign $el itself
7. ITERATION IS RARE - try hard to solve the request completely in one response.

Example: To change text, use $el.textContent = "new text"
Example: To add a class, use $el.classList.add("new-class")
Example: To change inner HTML, use $el.innerHTML = "<span>new</span>"
Example: To modify an ancestor, use $el.parentElement.classList.add("highlighted")

Your response must be raw JavaScript that can be directly eval'd.`;

const ALLOWED_ORIGINS_PROD = [
  "https://react-grab.com",
  "https://www.react-grab.com",
];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  if (process.env.NODE_ENV === "development") {
    if (origin.startsWith("http://localhost:")) return true;
    if (origin.startsWith("http://127.0.0.1:")) return true;
  }

  return ALLOWED_ORIGINS_PROD.includes(origin);
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

export async function POST(request: Request) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.OPENCODE_ZEN_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENCODE_ZEN_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const conversationMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const cacheKey = await generateCacheKey(messages);
    const cachedResponse = await kv.get<string>(cacheKey);

    if (cachedResponse) {
      return new Response(cachedResponse, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/javascript",
          "X-Cache": "HIT",
        },
      });
    }

    const response = await fetch(OPENCODE_ZEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `API error: ${response.status} - ${errorText}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content || "";

    await kv.set(cacheKey, generatedCode, { ex: CACHE_TTL_SECONDS });

    return new Response(generatedCode, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/javascript",
        "X-Cache": "MISS",
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
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403, headers: corsHeaders });
  }

  return new Response(null, { headers: corsHeaders });
}
