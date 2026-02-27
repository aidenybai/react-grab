"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import { CLICK_FEEDBACK_DURATION_MS } from "@/constants";
import { Button } from "@/components/ui/button";

interface ReadToolCallBlockProps {
  parameter: string;
  isStreaming?: boolean;
}

export const ReadToolCallBlock = ({
  parameter,
  isStreaming = false,
}: ReadToolCallBlockProps): ReactElement => {
  const [isClicked, setIsClicked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayName = isStreaming ? "Reading" : "Read";

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsClicked(true);
    timeoutRef.current = setTimeout(
      () => setIsClicked(false),
      CLICK_FEEDBACK_DURATION_MS,
    );
  };

  return (
    <div className="flex flex-wrap gap-1 text-[#818181]">
      <span className={isStreaming ? "shimmer-text" : ""}>{displayName}</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={handleClick}
        className="h-auto max-w-full break-all whitespace-normal px-0 py-0 text-left transition-colors duration-300"
        style={{
          color: isClicked ? "#ffffff" : "#5b5b5b",
        }}
      >
        {parameter}
      </Button>
    </div>
  );
};

ReadToolCallBlock.displayName = "ReadToolCallBlock";
