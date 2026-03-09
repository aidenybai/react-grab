"use client";
import React from "react";
import { motion } from "motion/react";

export function StaggerGrid({
  items,
  columns = 3,
  "data-testid": testId,
}: {
  items: { id: string; content: React.ReactNode; testId?: string }[];
  columns?: number;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16,
      }}
    >
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          data-testid={item.testId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
          style={{
            padding: 16,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        >
          {item.content}
        </motion.div>
      ))}
    </div>
  );
}
