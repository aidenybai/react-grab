"use client";

import React, { memo } from "react";

type BadgeColor = "gray" | "blue" | "green" | "red" | "yellow" | "purple";

interface BadgeProps {
  color?: BadgeColor;
  rounded?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}

const colorPalette: Record<
  BadgeColor,
  { bg: string; text: string; dot: string }
> = {
  gray: { bg: "#F3F4F6", text: "#4B5563", dot: "#9CA3AF" },
  blue: { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  green: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  red: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  yellow: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  purple: { bg: "#EDE9FE", text: "#5B21B6", dot: "#8B5CF6" },
};

export const Badge = memo(function Badge({
  color = "gray",
  rounded = true,
  dot = false,
  children,
}: BadgeProps) {
  const palette = colorPalette[color];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: palette.bg,
        color: palette.text,
        borderRadius: rounded ? 9999 : 4,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: palette.dot,
          }}
        />
      )}
      {children}
    </span>
  );
});
