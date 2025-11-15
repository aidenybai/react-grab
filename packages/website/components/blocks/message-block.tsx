"use client";

import { StreamingText } from "./streaming-text";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface MessageBlockProps {
  block: StreamRenderedBlock;
}

export const MessageBlock = ({ block }: MessageBlockProps) => {
  return (
    <div className="text-white">
      <StreamingText content={block.content} chunks={block.chunks || []} />
    </div>
  );
};
