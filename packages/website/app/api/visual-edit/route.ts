import { generateText } from "ai";
import type { ModelMessage } from "ai";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a DOM manipulation assistant. You will receive HTML with ancestor context and a modification request.

The HTML shows the target element nested within its ancestor elements (up to 5 levels). The target element is marked with <!-- START $el --> and <!-- END $el --> comments. The ancestor tags are shown for structural context only - you should only modify the target element between these markers.

CRITICAL RULES:
1. Output ONLY JavaScript code - nothing else
2. Do NOT wrap output in markdown code fences
3. Start with a single-line comment explaining what the code does (e.g. "// Changes button text to show loading state")
4. $el is a global variable that references the target element (marked between <!-- START $el --> and <!-- END $el -->)
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

const parseHostnameFromOrigin = (origin: string): string | null => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

const isReactGrabHostname = (hostname: string): boolean => {
  return (
    hostname === "react-grab.com" ||
    hostname === "www.react-grab.com" ||
    hostname === "www.aidenybai.com"
  );
};

const isReactGrabOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  const hostname = parseHostnameFromOrigin(origin);
  if (!hostname) return false;

  if (isReactGrabHostname(hostname)) return true;

  return false;
};

const getCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

// interface OpenCodeZenResponse {
//   choices: Array<{
//     message: {
//       content: string;
//     };
//   }>;
// }

// const generateTextWithOpenCodeZen = async (
//   systemPrompt: string,
//   messages: ModelMessage[],
// ): Promise<string> => {
//   const apiKey = process.env.OPENCODE_ZEN_API_KEY;
//   if (!apiKey) {
//     throw new Error("OPENCODE_ZEN_API_KEY not configured");
//   }

//   const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "grok-code",
//       messages: [{ role: "system", content: systemPrompt }, ...messages],
//     }),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`OpenCode Zen API error: ${response.status} ${errorText}`);
//   }

//   const data: OpenCodeZenResponse = await response.json();
//   return data.choices[0]?.message?.content ?? "";
// };

export const POST = async (request: Request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders();
  const shouldUsePrimaryModel = isReactGrabOrigin(origin);

  let body: { messages: ConversationMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { messages: rawMessages } = body;

  if (!rawMessages || rawMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const MAX_INPUT_CHARACTERS = 15_000;

  const messages: ModelMessage[] = rawMessages.map((message) => ({
    role: message.role,
    content: message.content.slice(0, MAX_INPUT_CHARACTERS),
    providerOptions: {
      cerebras: { cacheControl: { type: "ephemeral" } },
      zai: { cacheControl: { type: "ephemeral" } },
    },
  }));

  try {
    let generatedCode: string;

    console.log("shouldUsePrimaryModel", shouldUsePrimaryModel);
    // if (shouldUsePrimaryModel) {
    const result = await generateText({
      model: "cerebras/glm-4.6",
      system: SYSTEM_PROMPT,
      messages,
    });
    // eslint-disable-next-line prefer-const
    generatedCode = result.text;
    // } else {
    //   generatedCode = await generateTextWithOpenCodeZen(
    //     SYSTEM_PROMPT,
    //     messages,
    //   );
    // }

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

export const OPTIONS = () => {
  const corsHeaders = getCorsHeaders();
  return new Response(null, { status: 204, headers: corsHeaders });
};
