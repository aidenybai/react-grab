"use client";

import { useState, useEffect, type ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CODE_BLOCK_COLLAPSE_LINE_THRESHOLD,
  CODE_BLOCK_MAX_HEIGHT_PX,
} from "@/constants";
import { type StreamRenderedBlock } from "@/hooks/use-stream";
import { highlightCode } from "@/lib/shiki";
import { StreamingText } from "./streaming-text";

interface CodeBlockProps {
  block: StreamRenderedBlock;
}

export const CodeBlock = ({ block }: CodeBlockProps): ReactElement => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [shouldShowExpandButton, setShouldShowExpandButton] = useState(false);

  useEffect(() => {
    const highlightAsync = async () => {
      if (typeof block.content === "string") {
        const code = block.content;
        const lang = block.metadata?.lang || "typescript";
        const changedLines = block.metadata?.changedLines as
          | number[]
          | undefined;

        const html = await highlightCode({
          code,
          lang: lang as string,
          showLineNumbers: false,
          changedLines,
        });
        setHighlightedCode(html);

        const lineCount = code.split("\n").length;
        setShouldShowExpandButton(
          lineCount > CODE_BLOCK_COLLAPSE_LINE_THRESHOLD,
        );
      }
    };

    highlightAsync();
  }, [block.content, block.metadata]);

  const maxHeightStyle = !isExpanded
    ? { maxHeight: `${CODE_BLOCK_MAX_HEIGHT_PX}px` }
    : {};

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden shadow-lg">
      <div className="overflow-hidden" style={maxHeightStyle}>
        <div className="p-4 font-mono text-sm text-foreground overflow-x-auto">
          {highlightedCode ? (
            <div
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
              className="highlighted-code"
            />
          ) : (
            <pre className="text-foreground/80">
              <StreamingText
                content={block.content}
                chunks={block.chunks || []}
              />
            </pre>
          )}
        </div>
      </div>

      {shouldShowExpandButton && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-card via-card/95 to-transparent pointer-events-none" />
      )}

      {shouldShowExpandButton && (
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative h-auto w-full rounded-none py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-card"
          type="button"
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </Button>
      )}
    </div>
  );
};

CodeBlock.displayName = "CodeBlock";
