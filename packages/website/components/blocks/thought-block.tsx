"use client";

import { Collapsible } from "../collapsible";
import { Scrollable } from "../scrollable";
import { Timer } from "../timer";
import { StreamingText } from "./streaming-text";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface ThoughtBlockProps {
  block: StreamRenderedBlock;
}

export const ThoughtBlock = ({ block }: ThoughtBlockProps) => {
  return (
    <Collapsible
      key={`${block.id}-${block.status}`}
      header={
        <span className="text-[#818181]">
          {block.status === "streaming" ? "Thinking " : "Thought for "}
          <span className="text-[#5b5b5b]">
            <Timer
              isRunning={block.status === "streaming"}
              startTime={block.startTime}
              endTime={block.endTime}
            />
          </span>
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
