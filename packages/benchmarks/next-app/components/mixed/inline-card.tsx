"use client";
import React from "react";

export function InlineCard({
  title,
  children,
  accent = "#3b82f6",
  "data-testid": testId,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--background)",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
        }}
      />
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          margin: "0 0 8px",
          color: "var(--foreground)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontSize: 14,
          color: "var(--muted-foreground)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}
