"use client";
import React from "react";

const colors: Record<string, string> = {
  default: "bg-[var(--accent)] text-[var(--accent-foreground)]",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  purple: "bg-purple-100 text-purple-800",
};

export function TwBadge({
  children,
  color = "default",
  "data-testid": testId,
}: {
  children: React.ReactNode;
  color?: string;
  "data-testid"?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.default}`}
    >
      {children}
    </span>
  );
}
