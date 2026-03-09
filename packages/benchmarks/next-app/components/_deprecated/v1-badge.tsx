"use client";

import React from "react";

type V1BadgeColor = "blue" | "green" | "red" | "yellow" | "gray" | "purple";

interface V1BadgeProps {
  color?: V1BadgeColor;
  text: string;
  size?: "xs" | "sm" | "md";
  pill?: boolean;
  dot?: boolean;
  outline?: boolean;
  className?: string;
}

const colorMap: Record<
  V1BadgeColor,
  { bg: string; text: string; border: string; dot: string }
> = {
  blue: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd", dot: "#3b82f6" },
  green: { bg: "#dcfce7", text: "#166534", border: "#86efac", dot: "#22c55e" },
  red: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5", dot: "#ef4444" },
  yellow: { bg: "#fef9c3", text: "#854d0e", border: "#fde047", dot: "#eab308" },
  gray: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db", dot: "#6b7280" },
  purple: { bg: "#f3e8ff", text: "#6b21a8", border: "#c4b5fd", dot: "#a855f7" },
};

const sizeMap: Record<string, React.CSSProperties> = {
  xs: { fontSize: "10px", padding: "1px 6px" },
  sm: { fontSize: "12px", padding: "2px 8px" },
  md: { fontSize: "14px", padding: "3px 10px" },
};

export function V1Badge({
  color = "gray",
  text,
  size = "sm",
  pill = true,
  dot = false,
  outline = false,
  className,
}: V1BadgeProps) {
  const colors = colorMap[color];
  const sizeStyle = sizeMap[size];

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 500,
    lineHeight: 1.4,
    borderRadius: pill ? "9999px" : "4px",
    backgroundColor: outline ? "transparent" : colors.bg,
    color: colors.text,
    border: outline ? `1px solid ${colors.border}` : "none",
    ...sizeStyle,
  };

  return (
    <span style={style} className={className}>
      {dot && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: colors.dot,
            flexShrink: 0,
          }}
        />
      )}
      {text}
    </span>
  );
}

export default V1Badge;
