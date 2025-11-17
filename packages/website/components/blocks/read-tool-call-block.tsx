"use client";

import { useState } from "react";

interface ReadToolCallBlockProps {
  parameter: string;
  isStreaming?: boolean;
}

export const ReadToolCallBlock = ({
  parameter,
  isStreaming = false,
}: ReadToolCallBlockProps) => {
  const [isClicked, setIsClicked] = useState(false);
  const displayName = isStreaming ? "Reading" : "Read";

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
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
