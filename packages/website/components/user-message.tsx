"use client";

import { type ReactElement } from "react";
import { motion } from "motion/react";
import { type StreamRenderedBlock } from "@/hooks/use-stream";

interface UserMessageProps {
  block: StreamRenderedBlock;
  skipAnimation?: boolean;
}

export const UserMessage = ({
  block,
  skipAnimation = false,
}: UserMessageProps): ReactElement => {
  return (
    <motion.div
      initial={skipAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="ml-auto w-full max-w-full sm:w-auto sm:max-w-[80%] text-left text-foreground bg-card border border-border rounded-lg px-3 py-2"
    >
      {block.content}
    </motion.div>
  );
};

UserMessage.displayName = "UserMessage";
