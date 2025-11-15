"use client";

import { useStream } from "@/hooks/use-stream";
import { mockConversation } from "@/data/mock-conversation";
import { ThoughtBlock } from "./blocks/thought-block";
import { MessageBlock } from "./blocks/message-block";
import { CodeBlock } from "./blocks/code-block";
import { ToolCallsBlock } from "./blocks/tool-calls-block";
import { UserMessage } from "./user-message";

export const StreamDemo = () => {
  const stream = useStream({
    blocks: mockConversation,
    chunkSize: 4,
    chunkDelayMs: 25,
    blockDelayMs: 1000,
  });

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-2 text-lg pt-8">
        {stream.blocks.map((block) => {
          if (block.status === "pending") return null;

          if (block.type === "user_message") {
            return <UserMessage key={block.id} block={block} skipAnimation={stream.wasPreloaded} />;
          }

          if (block.type === "thought") {
            return <ThoughtBlock key={block.id} block={block} />;
          }

          if (block.type === "message") {
            return <MessageBlock key={block.id} block={block} />;
          }

          if (block.type === "code_block") {
            return <CodeBlock key={block.id} block={block} />;
          }

          if (block.type === "tool_call") {
            return (
              <ToolCallsBlock
                key={block.id}
                block={block}
                allBlocks={stream.blocks}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
