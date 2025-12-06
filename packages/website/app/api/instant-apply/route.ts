const OPENCODE_ZEN_ENDPOINT = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "grok-code";

const SYSTEM_PROMPT = `You are a DOM manipulation assistant. You will receive HTML and a modification request.

CRITICAL RULES:
1. Output ONLY JavaScript code - nothing else
2. Do NOT wrap output in markdown code fences
3. Do NOT include any explanations, comments, or preamble
4. Use $el to reference the target element
5. Modify the element using standard DOM APIs
6. Do NOT reassign $el itself

Example: To change text, use $el.textContent = "new text"
Example: To add a class, use $el.classList.add("new-class")
Example: To change inner HTML, use $el.innerHTML = "<span>new</span>"

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

interface InstantApplyRequest {
  prompt: string;
  html: string;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENCODE_ZEN_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENCODE_ZEN_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: InstantApplyRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { prompt, html } = body;

  if (!prompt || !html) {
    return new Response(
      JSON.stringify({ error: "Both prompt and html are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userMessage = `Here is the HTML to modify:

${html}

Modification request: ${prompt}

Remember: Output ONLY the JavaScript code, nothing else.`;

  try {
    const response = await fetch(OPENCODE_ZEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `API error: ${response.status} - ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content || "";

    return new Response(generatedCode, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/javascript",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
