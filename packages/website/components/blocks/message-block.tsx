"use client";

import { StreamingText } from "./streaming-text";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface MessageBlockProps {
  block: StreamRenderedBlock;
  animationDelay?: number;
}

export const MessageBlock = ({ block, animationDelay }: MessageBlockProps) => {
  return (
    <div className="text-white">
      <StreamingText content={block.content} chunks={block.chunks || []} animationDelay={animationDelay} />
    </div>
  );
};
