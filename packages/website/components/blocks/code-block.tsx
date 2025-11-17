"use client";

import { StreamingText } from "./streaming-text";
import { StreamRenderedBlock } from "@/hooks/use-stream";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { highlightCode } from "@/lib/shiki";

interface CodeBlockProps {
  block: StreamRenderedBlock;
}

export const CodeBlock = ({ block }: CodeBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);

  useEffect(() => {
    const highlightAsync = async () => {
      if (typeof block.content === "string") {
        const code = block.content;
        const lang = block.metadata?.lang || "typescript";
        const changedLines = block.metadata?.changedLines as number[] | undefined;

        const html = await highlightCode({
          code,
          lang: lang as string,
          showLineNumbers: false,
          changedLines
        });
        setHighlightedCode(html);

        const lineCount = code.split("\n").length;
        setShouldShowExpandButton(lineCount > 15);
      }
    };

    highlightAsync();
  }, [block.content, block.metadata]);

  const maxHeight = !isExpanded ? "max-h-[400px]" : "";

  return (
    <div className="relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className={`${maxHeight} overflow-hidden`}>
        <div className="p-4 font-mono text-sm text-white overflow-x-auto">
          {highlightedCode ? (
            <div
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              className="highlighted-code"
            />
          ) : (
            <pre className="text-[#d4d4d4]">
              <StreamingText content={block.content} chunks={block.chunks || []} />
            </pre>
          )}
        </div>
      </div>

      {shouldShowExpandButton && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent pointer-events-none" />
      )}

      {shouldShowExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-full py-2 flex items-center justify-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors bg-[#0d0d0d]"
          type="button"
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
};

CodeBlock.displayName = "CodeBlock";
