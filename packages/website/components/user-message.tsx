"use client";

import { motion } from "motion/react";
import { StreamRenderedBlock } from "@/hooks/use-stream";

interface UserMessageProps {
  block: StreamRenderedBlock;
  skipAnimation?: boolean;
}

export const UserMessage = ({ block, skipAnimation = false }: UserMessageProps) => {
  return (
    <motion.div
      initial={skipAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="ml-auto max-w-[80%] text-right text-white bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2"
    >
      {block.content}
    </motion.div>
  );
};
