"use client";

import { Collapsible } from "../collapsible";
import { GrepToolCallBlock } from "./grep-tool-call-block";
import { ReadToolCallBlock } from "./read-tool-call-block";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface ToolCallsBlockProps {
  block: StreamRenderedBlock;
  allBlocks: StreamRenderedBlock[];
}

export const ToolCallsBlock = ({ block, allBlocks }: ToolCallsBlockProps) => {
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

    const hasAnyCompleted = completedSearches > 0;
    const searchesLabel = `${completedSearches} search${completedSearches === 1 ? "" : "es"}`;

    const header = (
      <div className="text-[#818181]">
        {!hasAnyCompleted && <>Exploring</>}
        {hasAnyCompleted && (
          <>
            Explored <span className="text-[#5b5b5b]">{searchesLabel}</span>
          </>
        )}
      </div>
    );

    return (
      <Collapsible
        header={header}
        defaultExpanded
        isStreaming={grepBlocks.some(
          (innerBlock) => innerBlock.status === "streaming",
        )}
      >
        <div className="flex flex-col gap-2 mt-2">
          {grepBlocks.map((grepBlock, index) => {
            const result = typeof grepBlock.content === "string" && grepBlock.content
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
