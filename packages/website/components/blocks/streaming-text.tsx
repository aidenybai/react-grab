"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface StreamingTextProps {
  content: string | ReactNode | Array<string | ReactNode>;
  chunks: Array<{
    id: string;
    text: string;
  }>;
}

export const StreamingText = ({ content, chunks }: StreamingTextProps) => {
  if (Array.isArray(content)) {
    const streamedText = chunks.map(chunk => chunk.text).join("");

    return (
      <>
        {content.map((item, index) => {
          if (typeof item === "string") {
            if (chunks.length === 0) {
              return item;
            }
            return (
              <span key={`text-${index}`}>
                {chunks.map((chunk) => (
                  <motion.span
                    key={chunk.id}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {chunk.text}
                  </motion.span>
                ))}
              </span>
            );
          }
          return <span key={`node-${index}`}>{item}</span>;
        })}
      </>
    );
  }

  if (typeof content !== "string") {
    return <>{content}</>;
  }

  if (chunks.length === 0) {
    return <>{content}</>;
  }

  return (
    <>
      {chunks.map((chunk) => (
        <motion.span
          key={chunk.id}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {chunk.text}
        </motion.span>
      ))}
    </>
  );
};
