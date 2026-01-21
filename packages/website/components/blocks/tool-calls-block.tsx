"use client";

import { type ReactElement } from "react";
import { type StreamRenderedBlock } from "@/hooks/use-stream";
import { Collapsible } from "../ui/collapsible";
import { ExploredHeader } from "./grep-search-group";
import { GrepToolCallBlock } from "./grep-tool-call-block";
import { ReadToolCallBlock } from "./read-tool-call-block";

interface ToolCallsBlockProps {
  block: StreamRenderedBlock;
  allBlocks: StreamRenderedBlock[];
}

export const ToolCallsBlock = ({
  block,
  allBlocks,
}: ToolCallsBlockProps): ReactElement | null => {
  const metadata = block.metadata || {};
  const toolCallType = metadata.toolCallType as string | undefined;

  if (toolCallType === "grep-group") {
    const grepBlocks = allBlocks.filter(
      (innerBlock) =>
        innerBlock.metadata?.toolCallType === "grep" &&
        innerBlock.status !== "pending",
    );

    const completedSearches = grepBlocks.filter(
      (innerBlock) => innerBlock.status === "complete",
    ).length;

    return (
      <Collapsible
        header={<ExploredHeader completedCount={completedSearches} />}
        defaultExpanded
        isStreaming={grepBlocks.some(
          (innerBlock) => innerBlock.status === "streaming",
        )}
      >
        <div className="flex flex-col gap-2 mt-2">
          {grepBlocks.map((grepBlock) => {
            const result =
              typeof grepBlock.content === "string" && grepBlock.content
                ? grepBlock.content
                : (grepBlock.metadata?.result as string | undefined);

            return (
              <GrepToolCallBlock
                key={grepBlock.id}
                parameter={grepBlock.metadata?.parameter as string}
                result={result}
                isStreaming={grepBlock.status === "streaming"}
              />
            );
          })}
        </div>
      </Collapsible>
    );
  }

  if (toolCallType === "read") {
    return (
      <ReadToolCallBlock
        parameter={metadata.parameter as string}
        isStreaming={block.status === "streaming"}
      />
    );
  }

  return null;
};

ToolCallsBlock.displayName = "ToolCallsBlock";
