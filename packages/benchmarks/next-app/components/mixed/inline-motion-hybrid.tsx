"use client";
import React from "react";
import { motion } from "motion/react";

export function InlineMotionHybrid({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <motion.div
      data-testid={testId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--background)",
        padding: 20,
        overflow: "hidden",
      }}
    >
      <motion.h3
        initial={{ x: -10 }}
        animate={{ x: 0 }}
        style={{
          fontSize: 16,
          fontWeight: 600,
          margin: "0 0 8px",
          color: "var(--foreground)",
        }}
      >
        Inline + Motion
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 14,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
        }}
      >
        Pure inline styles combined with motion animations. No CSS classes.
      </motion.p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="inline-motion-button"
        style={{
          marginTop: 12,
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          fontWeight: 500,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Animated Button
      </motion.button>
    </motion.div>
  );
}
