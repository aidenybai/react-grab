"use client";

import { useStream, type StreamRenderedBlock } from "@/hooks/use-stream";
import { mockConversation } from "@/data/mock-conversation";
import { ThoughtBlock } from "./blocks/thought-block";
import { MessageBlock } from "./blocks/message-block";
import { CodeBlock } from "./blocks/code-block";
import { ToolCallsBlock } from "./blocks/tool-calls-block";
import { UserMessage } from "./user-message";
import { GrabElementButton } from "./grab-element-button";
import { useState, useEffect, useRef, Fragment } from "react";

const StreamDemoInner = () => {
  const [updatedBlocks, setUpdatedBlocks] = useState(mockConversation);
  const [shouldShowGrabButton, setShouldShowGrabButton] = useState(false);
  const shouldResumeRef = useRef(false);

  const stream = useStream({
    blocks: updatedBlocks,
    chunkSize: 4,
    chunkDelayMs: 20,
    blockDelayMs: 400,
    pauseAtBlockId: "message-2",
  });

  useEffect(() => {
    if (stream.isPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldShowGrabButton(true);
    }
  }, [stream.isPaused]);

  useEffect(() => {
    if (shouldResumeRef.current && updatedBlocks.find((block) => block.id === "user-2")?.content) {
      shouldResumeRef.current = false;
      stream.resume();
    }
  }, [updatedBlocks, stream]);

  const handleElementSelect = (elementTag: string) => {
    const newBlocks = updatedBlocks.map((block) => {
      if (block.id === "user-2") {
        return {
          ...block,
          content: (
            <div className="flex items-center gap-1">
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
  };

  const renderBaseBlock = (block: StreamRenderedBlock) => {
    if (block.status === "pending") return null;

    if (block.type === "user_message") {
      if (!block.content) return null;
      return <UserMessage block={block} skipAnimation={stream.wasPreloaded} />;
    }

    if (block.type === "thought") {
      return <ThoughtBlock block={block} />;
    }

    if (block.type === "message") {
      return <MessageBlock block={block} />;
    }

    if (block.type === "code_block") {
      return <CodeBlock block={block} />;
    }

    if (block.type === "tool_call") {
      return <ToolCallsBlock block={block} allBlocks={stream.blocks} />;
    }

    return null;
  };

  const reactGrabStartId = "message-4";
  const reactGrabStartIndex = stream.blocks.findIndex((block) => block.id === reactGrabStartId);

  const postBlocks = stream.wasPreloaded && reactGrabStartIndex > 0
    ? stream.blocks.slice(reactGrabStartIndex)
    : stream.blocks;

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 pt-8 text-lg">
        {stream.wasPreloaded ? (
          postBlocks.map((block) => {
            const rendered = renderBaseBlock(block);
            if (!rendered) return null;

            return (
              <Fragment key={block.id}>
                {rendered}
                {block.id === "message-5" && (
                  <GrabElementButton onSelect={handleElementSelect} showSkip={false} />
                )}
              </Fragment>
            );
          })
        ) : (
          stream.blocks.map((block) => {
            const rendered = renderBaseBlock(block);
            if (!rendered) return null;

            return (
              <Fragment key={block.id}>
                {rendered}
                {block.id === "message-2" && shouldShowGrabButton && (
                  <GrabElementButton onSelect={handleElementSelect} />
                )}
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export const StreamDemo = () => {
  return <StreamDemoInner />;
};
