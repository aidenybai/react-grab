"use client";

import { type ReactElement } from "react";
import { type StreamRenderedBlock } from "@/hooks/use-stream";
import { StreamingText } from "./streaming-text";

interface MessageBlockProps {
  block: StreamRenderedBlock;
  animationDelay?: number;
}

export const MessageBlock = ({
  block,
  animationDelay,
}: MessageBlockProps): ReactElement => {
  return (
    <div className="text-white">
      <StreamingText
        content={block.content}
        chunks={block.chunks || []}
        animationDelay={animationDelay}
      />
    </div>
  );
};

MessageBlock.displayName = "MessageBlock";
