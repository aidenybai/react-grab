import { ReactGrabLogo } from "@/components/react-grab-logo";
import { InstallTabs } from "@/components/install-tabs";
import { DemoFooter } from "@/components/demo-footer";
import { StreamBlock } from "@/hooks/use-stream";
import { IconCursor } from "@/components/icon-cursor";
import { IconClaude } from "@/components/icon-claude";
import { IconCopilot } from "@/components/icon-copilot";
import { IconGithub } from "@/components/icon-github";
import { TriangleAlert } from "lucide-react";

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
    content: (
      <span className="text-[#ff8080] inline-flex items-center gap-2">
        <TriangleAlert size={16} />
        I couldn&apos;t find what you&apos;re looking for :(
      </span>
    ),
  },
  {
    id: "user-2",
    type: "user_message",
    content: "",
  },
  {
    id: "message-2-5",
    type: "message",
    content: (
      <span>
        I see you attached{" "}
        <span className="inline-flex items-center rounded-md bg-[#330039] px-1 py-0.5 text-xs font-mono text-[#ff4fff]">
          src/components/ui/primary-button.tsx
        </span>
        . It&apos;s next to the cancel button at line 42, currently using{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">
          medium
        </code>{" "}
        size (
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">
          38px
        </code>
        ). Let me take a closer look.
      </span>
    ),
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
          <span className="font-bold">React Grab</span> allows you to select an
          element and copy it{"'"}s context (like HTML, React component source,
          CSS, etc.)
        </div>
      </div>
    ),
  },
  {
    id: "message-5",
    type: "message",
    content: (
      <span>
        It improves the accuracy of tools like{" "}
        <span className="inline-flex items-center gap-1">
          <IconCursor width={14} height={14} />
          Cursor
        </span>
        ,{" "}
        <span className="inline-flex items-center gap-1">
          <IconClaude width={14} height={14} />
          Claude Code
        </span>
        ,{" "}
        <span className="inline-flex items-center gap-1">
          <IconCopilot width={16} height={16} />
          Copilot
        </span>
        , you name it!
      </span>
    ),
  },
  {
    id: "message-6",
    type: "message",
    content: "It takes 1 script tag to get started:",
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
        <div className="flex gap-2">
          <a
            href="https://github.com/aidenybai/react-grab"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white px-3 py-1.5 text-sm text-black transition-colors hover:bg-white/90"
          >
            <IconGithub className="h-[18px] w-[18px]" />
            Star on GitHub
          </a>
          <a
            href="https://cursor.com/link/prompt?text=1.+Search+in+this+codebase+for+the+project%0A2.+Determine+if+the+project+is+using+Next.js+app%2Fpages+router%2C+or+Vite%2C+or+something+else.+Then%2C+modify+their+files+based+on+the+framework%3A%0A%0ANext.js+%28App+router%29%0A%0AAdd+this+inside+of+your+%60app%2Flayout.tsx%60%3A%0A%0A%60%60%60jsx%0Aimport+Script+from+%22next%2Fscript%22%3B%0A%0Aexport+default+function+RootLayout%28%7B+children+%7D%29+%7B%0A++return+%28%0A++++%3Chtml%3E%0A++++++%3Chead%3E%0A++++++++%7B%2F*+put+this+in+the+%3Chead%3E+*%2F%7D%0A++++++++%7Bprocess.env.NODE_ENV+%3D%3D%3D+%22development%22+%26%26+%28%0A++++++++++%3CScript%0A++++++++++++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++++++++++++crossOrigin%3D%22anonymous%22%0A++++++++++++strategy%3D%22beforeInteractive%22%0A++++++++++++data-enabled%3D%22true%22%0A++++++++++%2F%3E%0A++++++++%29%7D%0A++++++++%7B%2F*+rest+of+your+scripts+go+under+*%2F%7D%0A++++++%3C%2Fhead%3E%0A++++++%3Cbody%3E%7Bchildren%7D%3C%2Fbody%3E%0A++++%3C%2Fhtml%3E%0A++%29%3B%0A%7D%0A%60%60%60%0A%0A%23%23%23%23+Next.js+%28Pages+router%29%0A%0AAdd+this+into+your+%60pages%2F_document.tsx%60%3A%0A%0A%60%60%60jsx%0Aimport+%7B+Html%2C+Head%2C+Main%2C+NextScript+%7D+from+%22next%2Fdocument%22%3B%0A%0Aexport+default+function+Document%28%29+%7B%0A++return+%28%0A++++%3CHtml+lang%3D%22en%22%3E%0A++++++%3CHead%3E%0A++++++++%7B%2F*+put+this+in+the+%3CHead%3E+*%2F%7D%0A++++++++%7Bprocess.env.NODE_ENV+%3D%3D%3D+%22development%22+%26%26+%28%0A++++++++++%3CScript%0A++++++++++++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++++++++++++crossOrigin%3D%22anonymous%22%0A++++++++++++strategy%3D%22beforeInteractive%22%0A++++++++++++data-enabled%3D%22true%22%0A++++++++++%2F%3E%0A++++++++%29%7D%0A++++++++%7B%2F*+rest+of+your+scripts+go+under+*%2F%7D%0A++++++%3C%2FHead%3E%0A++++++%3Cbody%3E%0A++++++++%3CMain+%2F%3E%0A++++++++%3CNextScript+%2F%3E%0A++++++%3C%2Fbody%3E%0A++++%3C%2FHtml%3E%0A++%29%3B%0A%7D%0A%60%60%60%0A%0A%23%23%23%23+Vite%0A%0A1.+Run+%60npm+i+react-grab%40latest%60%0A2.+Add+this+to+your+%60vite.config.ts%60%3A%0A%0A%60%60%60ts%0A%2F%2F+...%0Aimport+%7B+reactGrab+%7D+from+%22react-grab%2Fplugins%2Fvite%22%3B%0A%0Aexport+default+defineConfig%28%7B%0A++plugins%3A+%5B%0A++++%2F%2F+add+react+grab+as+a+plugin%0A++++reactGrab%28%29%2C%0A++%5D%2C%0A%7D%29%3B%0A%60%60%60%0A%0A3.+If+no+framework+or+project+available%2C+ask+the+user+where+it+is+or+what+it+is.+If+there+is+a+project+but+no+framework%2C+then+use%3A%0A%0A%60%60%60html%0A%3Cscript%0A++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++crossorigin%3D%22anonymous%22%0A++data-enabled%3D%22true%22%0A%3E%3C%2Fscript%3E%0A%60%60%60%0A%0ATo+install"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            <IconCursor className="h-[15px] w-[15px]" />
            Install with Cursor
          </a>
        </div>
        <DemoFooter />
      </div>
    ),
  },
];
