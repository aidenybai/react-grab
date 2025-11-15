"use client";

import { motion } from "motion/react";

interface StreamingTextProps {
  content: string;
  chunks: Array<{
    id: string;
    text: string;
  }>;
}

export const StreamingText = ({ content, chunks }: StreamingTextProps) => {
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
