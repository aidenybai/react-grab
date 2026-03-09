"use client";
import React, { useState } from "react";
import { motion } from "motion/react";

export function AnimatedTabs({
  tabs,
  "data-testid": testId,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  "data-testid"?: string;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  return (
    <div data-testid={testId}>
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          position: "relative",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color:
                activeTab === tab.id
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
              position: "relative",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="animated-tab-indicator"
                data-testid="animated-tab-indicator"
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--primary)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 0" }}>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
