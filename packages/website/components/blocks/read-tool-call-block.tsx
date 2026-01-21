"use client";

import { useState, useRef, useEffect } from "react";
import { CLICK_FEEDBACK_DURATION_MS } from "@/constants";

interface ReadToolCallBlockProps {
  parameter: string;
  isStreaming?: boolean;
}

export const ReadToolCallBlock = ({
  parameter,
  isStreaming = false,
}: ReadToolCallBlockProps) => {
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
      <button
        onClick={handleClick}
        className="max-w-full break-all text-left transition-colors duration-300"
        style={{
          color: isClicked ? "#ffffff" : "#5b5b5b",
        }}
      >
        {parameter}
      </button>
    </div>
  );
};

ReadToolCallBlock.displayName = "ReadToolCallBlock";
