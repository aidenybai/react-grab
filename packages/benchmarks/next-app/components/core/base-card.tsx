"use client";

import React from "react";

type CardVariant = "elevated" | "filled" | "outlined";

interface BaseCardProps {
  variant?: CardVariant;
  clickable?: boolean;
  children: React.ReactNode;
  header?: React.ReactNode;
  media?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
}

const variantCardStyles: Record<CardVariant, React.CSSProperties> = {
  elevated: {
    backgroundColor: "#FFFBFE",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)",
    border: "none",
  },
  filled: { backgroundColor: "#E7E0EC", border: "none", boxShadow: "none" },
  outlined: {
    backgroundColor: "#FFFBFE",
    border: "1px solid #CAC4D0",
    boxShadow: "none",
  },
};

export function BaseCard({
  variant = "elevated",
  clickable = false,
  children,
  header,
  media,
  actions,
  onClick,
}: BaseCardProps) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        cursor: clickable ? "pointer" : "default",
        ...variantCardStyles[variant],
      }}
    >
      {media}
      {header && <div style={{ padding: "16px 16px 0" }}>{header}</div>}
      <div style={{ padding: 16 }}>{children}</div>
      {actions && (
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
