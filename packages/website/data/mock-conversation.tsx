import { ReactGrabLogo } from "@/components/react-grab-logo";
import { InstallTabs } from "@/components/install-tabs";
import { DemoFooter } from "@/components/demo-footer";
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
      parameter: 'type="submit"',
    },
  },
  {
    id: "message-2",
    type: "message",
    content: "I couldn't find what you're looking for :(",
  },
  {
    id: "user-2",
    type: "user_message",
    content: "",
  },
  {
    id: "tool-read-1",
    type: "tool_call",
    content: "",
    metadata: {
      toolCallType: "read",
      parameter: "primary-button.tsx",
    },
  },
  {
    id: "message-3",
    type: "message",
    content: "Found it. Let me resize it for you.",
  },
  {
    id: "hr-1",
    type: "message",
    content: <hr className="my-4 border-white/10" />,
  },
  {
    id: "message-4",
    type: "message",
    content: (
      <div key="content" className="flex flex-col gap-2">
        <ReactGrabLogo
          key="logo"
          width={42}
          height={42}
          className="logo-shimmer-once"
        />
        <div>
          <span className="font-bold">React Grab</span> allows you to select
          elements on the page and extracts relevant context (like HTML, React
          component, CSS, etc.).
        </div>
      </div>
    ),
  },
  {
    id: "message-5",
    type: "message",
    content:
      "You can use it in any AI coding tool: Cursor, Claude Code, Copilot, you name it",
  },
  {
    id: "message-6",
    type: "message",
    content:
      "If you're using a React framework or build tool, here are quick setup instructions:",
  },
  {
    id: "install-tabs-1",
    type: "message",
    content: <InstallTabs />,
  },
  {
    id: "message-7",
    type: "message",
    content: (
      <div className="pt-2">
        <div>
          <a
            href="https://github.com/aidenybai/react-grab"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            Learn more on GitHub
          </a>
        </div>
        <DemoFooter />
      </div>
    ),
  },
];
