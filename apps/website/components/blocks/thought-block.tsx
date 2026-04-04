"use client";

import { type ReactElement } from "react";
import { type StreamRenderedBlock } from "@/hooks/use-stream";
import { Collapsible } from "../ui/collapsible";
import { Scrollable } from "../ui/scrollable";
import { StreamingText } from "./streaming-text";

interface ThoughtBlockProps {
  block: StreamRenderedBlock;
}

export const ThoughtBlock = ({ block }: ThoughtBlockProps): ReactElement => {
  return (
    <Collapsible
      key={`${block.id}-${block.status}`}
      header={
        <span className="text-[#818181]">
          {block.status === "streaming" ? "Thinking " : "Thought for "}
          {block.status !== "streaming" && block.duration && (
            <span className="text-[#5b5b5b]">
              {block.duration >= 1000
                ? `${Math.round(block.duration / 1000)}s`
                : `${block.duration}ms`}
            </span>
          )}
        </span>
      }
      defaultExpanded={block.status === "streaming"}
      isStreaming={block.status === "streaming"}
    >
      <div className="mt-1">
        <Scrollable className="text-[#818181]" maxHeight="100px">
          <StreamingText content={block.content} chunks={block.chunks || []} />
        </Scrollable>
      </div>
    </Collapsible>
  );
};

ThoughtBlock.displayName = "ThoughtBlock";
