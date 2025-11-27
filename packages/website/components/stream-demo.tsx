"use client";

import Image from "next/image";
import {
  useStream,
  type StreamRenderedBlock,
  type StreamBlock,
} from "@/hooks/use-stream";
import { ThoughtBlock } from "./blocks/thought-block";
import { MessageBlock } from "./blocks/message-block";
import { CodeBlock } from "./blocks/code-block";
import { ToolCallsBlock } from "./blocks/tool-calls-block";
import { UserMessage } from "./user-message";
import { GrabElementButton } from "./grab-element-button";
import { ReactGrabLogo } from "./react-grab-logo";
import { InstallTabs } from "./install-tabs";
import { DemoFooter } from "./demo-footer";
import { IconCursor } from "./icon-cursor";
import { IconClaude } from "./icon-claude";
import { IconCopilot } from "./icon-copilot";
import { GithubButton } from "./github-button";
import { CursorInstallButton } from "./cursor-install-button";
import { TriangleAlert } from "lucide-react";
import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { detectMobile } from "@/utils/detect-mobile";
import demoGif from "@/public/demo.gif";
import { BenchmarkTooltip } from "./benchmark-tooltip";
import { HotkeyProvider } from "./hotkey-context";

const getConversationBlocks = (): StreamBlock[] => [
  {
    id: "user-1",
    type: "user_message",
    content: "Can you make the submit button bigger?",
  },
  {
    id: "thought-1",
    type: "thought",
    content:
      "I need to find the submit button in their codebase. Let me search for submit buttons across the project that might satisfy the user's request.",
    duration: 1000,
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
        <TriangleAlert size={16} />I couldn&apos;t find what you&apos;re looking
        for :(
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
        <div
          className="inline-flex"
          style={{ padding: "2px", transform: "translateX(-3px)" }}
        >
          <ReactGrabLogo
            key="logo"
            width={42}
            height={42}
            className="logo-shimmer-once"
          />
        </div>
        <div>
          <span className="font-bold">React Grab</span> allows you to select an
          element and copy its context (like HTML, React component, and file
          source)
        </div>
      </div>
    ),
  },
  {
    id: "message-5",
    type: "message",
    content: (
      <span>
        It makes tools like{" "}
        <span className="inline-flex items-baseline gap-1">
          <IconCursor width={16} height={16} className="translate-y-[2px]" />
          Cursor
        </span>
        ,{" "}
        <span className="inline-flex items-baseline gap-1">
          <IconClaude width={16} height={16} className="translate-y-[2px]" />
          Claude Code
        </span>
        ,{" "}
        <span className="inline-flex items-baseline gap-1">
          <IconCopilot width={18} height={18} className="translate-y-[2px]" />
          Copilot run up to
        </span>{" "}
        <BenchmarkTooltip
          href="/blog/intro"
          className="shimmer-text-pink inline-block touch-manipulation py-1"
        >
          <span className="font-bold font-mono">55%</span> faster
        </BenchmarkTooltip>
      </span>
    ),
  },
  {
    id: "message-6",
    type: "message",
    content: (
      <span className="hidden sm:inline">
        It takes 1 script tag to get started:
      </span>
    ),
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
          <GithubButton />
          <CursorInstallButton />
        </div>
        <DemoFooter />
      </div>
    ),
  },
];

const getBlockSpacing = (blockId: string): string => {
  if (blockId === "user-2") return "mt-10";
  if (blockId === "message-6" || blockId === "message-7") return "mt-6";
  return "";
};

const renderBlock = (
  block: StreamRenderedBlock,
  blockIndex: number | undefined,
  wasPreloaded: boolean,
  allBlocks: StreamRenderedBlock[],
) => {
  if (block.status === "pending") return null;

  const animationDelay =
    wasPreloaded && blockIndex !== undefined ? blockIndex * 0.03 : 0;

  if (block.type === "user_message") {
    if (!block.content) return null;
    return <UserMessage block={block} skipAnimation={wasPreloaded} />;
  }

  if (block.type === "thought") {
    return <ThoughtBlock block={block} />;
  }

  if (block.type === "message") {
    return <MessageBlock block={block} animationDelay={animationDelay} />;
  }

  if (block.type === "code_block") {
    return <CodeBlock block={block} />;
  }

  if (block.type === "tool_call") {
    return <ToolCallsBlock block={block} allBlocks={allBlocks} />;
  }

  return null;
};

const filterMobileBlocks = (
  blocks: StreamRenderedBlock[],
  isMobile: boolean,
): StreamRenderedBlock[] => {
  if (!isMobile) return blocks;
  return blocks.filter(
    (block) => block.id !== "message-6" && block.id !== "install-tabs-1",
  );
};

export const StreamDemo = () => {
  const [updatedBlocks, setUpdatedBlocks] = useState(getConversationBlocks);
  const [isMobile] = useState(detectMobile);
  const shouldResumeRef = useRef(false);

  const stream = useStream({
    blocks: updatedBlocks,
    chunkSize: 4,
    chunkDelayMs: 20,
    blockDelayMs: 400,
    pauseAtBlockId: "message-2",
  });

  useEffect(() => {
    if (
      shouldResumeRef.current &&
      updatedBlocks.find((block) => block.id === "user-2")?.content
    ) {
      shouldResumeRef.current = false;
      stream.resume();
    }
  }, [updatedBlocks, stream]);

  const handleElementSelect = useCallback((elementTag: string) => {
    const newBlocks = updatedBlocks.map((block) => {
      if (block.id === "user-2") {
        return {
          ...block,
          content: (
            <div className="flex items-center gap-1 flex-wrap">
              Here{"'"}s the element
              <span
                key="badge"
                className="inline-flex items-center rounded-md bg-[#330039] px-1 py-0.5 text-xs font-mono text-[#ff4fff]"
              >
                {`<${elementTag}>`}
              </span>
            </div>
          ),
        };
      }
      return block;
    });

    shouldResumeRef.current = true;
    setUpdatedBlocks(newBlocks);
  }, [updatedBlocks]);

  const reactGrabStartId = "message-4";
  const reactGrabStartIndex = stream.blocks.findIndex(
    (block) => block.id === reactGrabStartId,
  );

  const blocksToRender =
    stream.wasPreloaded && reactGrabStartIndex > 0
      ? stream.blocks.slice(reactGrabStartIndex)
      : stream.blocks;

  const filteredBlocks = filterMobileBlocks(blocksToRender, isMobile);

  return (
    <HotkeyProvider>
      <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8 sm:text-lg">
          {filteredBlocks.map((block, index) => {
            const rendered = renderBlock(
              block,
              stream.wasPreloaded ? index : undefined,
              stream.wasPreloaded,
              stream.blocks,
            );
            if (!rendered) return null;

            const spacing = getBlockSpacing(block.id);

            return (
              <Fragment key={block.id}>
                <div className={spacing}>{rendered}</div>
                {block.id === "message-2" &&
                  stream.isPaused &&
                  !stream.wasPreloaded && (
                    <GrabElementButton onSelect={handleElementSelect} />
                  )}
                {block.id === "message-5" && (
                  <>
                    {isMobile && (
                      <Image
                        src={demoGif}
                        alt="React Grab demo"
                        className="mt-3 w-full rounded-lg border border-white/10"
                        width={800}
                        height={450}
                        priority
                      />
                    )}
                    {stream.wasPreloaded && (
                      <GrabElementButton
                        onSelect={handleElementSelect}
                        showSkip={false}
                        animationDelay={(index + 1) * 0.03}
                      />
                    )}
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </HotkeyProvider>
  );
};

StreamDemo.displayName = "StreamDemo";
