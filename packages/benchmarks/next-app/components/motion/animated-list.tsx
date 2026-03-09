"use client";
import React from "react";
import { motion, AnimatePresence } from "motion/react";

export function AnimatedList({
  items,
  "data-testid": testId,
}: {
  items: { id: string; content: React.ReactNode; testId?: string }[];
  "data-testid"?: string;
}) {
  return (
    <ul
      data-testid={testId}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      <AnimatePresence>
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            data-testid={item.testId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: i * 0.05 }}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              fontSize: 14,
            }}
          >
            {item.content}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
