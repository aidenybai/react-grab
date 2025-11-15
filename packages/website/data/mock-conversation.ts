import { StreamBlock } from "@/hooks/use-stream";

export const mockConversation: StreamBlock[] = [
  {
    id: "user-1",
    type: "user_message",
    content: "Can you make the submit button bigger?",
  },
  {
    id: "thought-1",
    type: "thought",
    content:
      "The user wants to make a submit button bigger. I need to find the submit button in their codebase. Let me search for submit buttons across the project. I'll try searching for common patterns like 'submit', 'type=\"submit\"', and button elements. This might take a few searches since I don't know exactly where the button is located or what file it's in.",
    duration: 2000,
  },
  {
    id: "message-1",
    type: "message",
    content: "Let me search for the submit button in your codebase.",
  },
  {
    id: "tool-grep-group",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "grep-group",
    },
  },
  {
    id: "tool-grep-1",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "grep",
      parameter: "submit",
    },
  },
  {
    id: "tool-grep-2",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "grep",
      parameter: "button",
    },
  },
  {
    id: "tool-grep-3",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "grep",
      parameter: "Submit",
    },
  },
  {
    id: "tool-grep-4",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "grep",
      parameter: 'type="submit"',
    },
  },
  {
    id: "message-2",
    type: "message",
    content:
      "I found many submit buttons across your codebase. Which file or component contains the one you want to resize?",
  },
  {
    id: "user-2",
    type: "user_message",
    content: "[1 element]",
  },
  {
    id: "message-4",
    type: "message",
    content:
      "React Grab fixes this. It allows you to select elements on the page (Hold Cmd+C) and extracts relevant context about the HTML, React component, CSS, etc. to help the agent find it.",
  },
  {
    id: "tool-read-1",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "read",
      parameter: "components/todo-item.tsx",
    },
  },
  {
    id: "message-5",
    type: "message",
    content: "YES! I found it! It takes just 1 script tag to add to your app:",
  },
  {
    id: "code-1",
    type: "code_block",
    content: `<script
  src="//unpkg.com/react-grab/dist/index.global.js"
  crossorigin="anonymous"
  data-enabled="true"
></script>`,
  },
  {
    id: "message-6",
    type: "message",
    content:
      "For Next.js or Vite projects, check out the full installation guide at react-grab.com",
  },
];
