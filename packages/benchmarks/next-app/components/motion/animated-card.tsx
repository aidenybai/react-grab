"use client";
import React from "react";
import { motion } from "motion/react";

export function AnimatedCard({
  children,
  layoutId,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  layoutId?: string;
  "data-testid"?: string;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      data-testid={testId}
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--background)",
        padding: 24,
      }}
    >
      {children}
    </motion.div>
  );
}
