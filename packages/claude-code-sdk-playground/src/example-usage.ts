/**
 * Example: How to use the Claude Agent Provider with react-grab
 *
 * This file demonstrates integrating the Claude Code SDK backend
 * with react-grab's agent provider system.
 */

import { createClaudeAgentProvider } from "./client.js";

// In your React app, you would do:
//
// import { init } from "react-grab";
// import { createClaudeAgentProvider } from "claude-code-sdk-playground/client";
//
// const claudeProvider = createClaudeAgentProvider("http://localhost:3001");
//
// init({
//   agentProvider: claudeProvider,
//   agentSessionStorage: "sessionStorage",
//   onAgentStart: (session) => {
//     console.log("Agent started:", session.id);
//   },
//   onAgentStatus: (status, session) => {
//     console.log("Status update:", status);
//   },
//   onAgentComplete: (session) => {
//     console.log("Agent completed!");
//   },
//   onAgentError: (error, session) => {
//     console.error("Agent error:", error);
//   },
// });

const testAgentProvider = async () => {
  const provider = createClaudeAgentProvider();

  const testContext = {
    content: `<selected_element>
## HTML Frame:
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  Click me
</button>

## Code Location:
src/components/Button.tsx:15
</selected_element>`,
    prompt: "Change the button color to green",
  };

  console.log("Testing agent provider...");
  console.log("Context:", testContext);
  console.log("---");

  const abortController = new AbortController();

  try {
    for await (const status of provider.send(testContext, abortController.signal)) {
      console.log("Status:", status);
    }
    console.log("---");
    console.log("Agent completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
};

testAgentProvider();
