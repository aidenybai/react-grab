import { generateText } from "ai";
import type { ModelMessage } from "ai";
import {
  getCorsHeaders,
  createOptionsResponse,
  createErrorResponse,
} from "@/lib/api-helpers";

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
8. If you need custom CSS (including animations/keyframes), inject a <style> tag into the document head - do not assume any styles, classes, or animations are pre-defined.
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

const corsOptions = { methods: ["POST", "OPTIONS", "GET"] as const };

export const POST = async (request: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(corsOptions);

  let body: { messages: ConversationMessage[] };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(new Error("Invalid JSON"), {
      status: 400,
      corsOptions,
    });
  }

  const { messages: rawMessages } = body;

  if (!rawMessages || rawMessages.length === 0) {
    return createErrorResponse(new Error("messages array is required"), {
      status: 400,
      corsOptions,
    });
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
    const result = await generateText({
      model: "cerebras/glm-4.6",
      system: SYSTEM_PROMPT,
      messages,
    });
    const generatedCode = result.text;

    return new Response(generatedCode, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/javascript",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    return createErrorResponse(error, { status: 500, corsOptions });
  }
};

export const OPTIONS = (): Response => createOptionsResponse(corsOptions);
