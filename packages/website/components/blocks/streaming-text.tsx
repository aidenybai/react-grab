"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface StreamingTextProps {
  content: string | ReactNode | Array<string | ReactNode>;
  chunks: Array<{
    id: string;
    text: string;
  }>;
  animationDelay?: number;
}

export const StreamingText = ({
  content,
  chunks,
  animationDelay = 0,
}: StreamingTextProps) => {
  const isInstantContent = chunks.length === 0;

  if (Array.isArray(content)) {
    return (
      <>
        {content.map((item, index) => {
          if (typeof item === "string") {
            if (isInstantContent) {
              return (
                <motion.span
                  key={`text-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                    delay: animationDelay,
                  }}
                >
                  {item}
                </motion.span>
              );
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
    if (isInstantContent) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: animationDelay }}
        >
          {content}
        </motion.div>
      );
    }
    return <>{content}</>;
  }

  if (isInstantContent) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: animationDelay }}
      >
        {content}
      </motion.span>
    );
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

StreamingText.displayName = "StreamingText";
