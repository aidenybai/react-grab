"use client";

import { StreamingText } from "./streaming-text";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface CodeBlockProps {
  block: StreamRenderedBlock;
}

export const CodeBlock = ({ block }: CodeBlockProps) => {
  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 font-mono text-sm text-white overflow-x-auto">
      <pre className="text-[#d4d4d4]">
        <StreamingText content={block.content} chunks={block.chunks || []} />
      </pre>
    </div>
  );
};
