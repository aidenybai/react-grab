"use client";

import React from "react";

interface LayoutCardProps {
  children: React.ReactNode;
  gap?: number;
  padding?: "none" | "sm" | "md" | "lg";
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  className?: string;
}

const paddingMap = { none: 0, sm: 12, md: 20, lg: 32 };

export function Card({
  children,
  gap = 0,
  padding = "md",
  direction = "column",
  align = "stretch",
  className,
}: LayoutCardProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: direction,
        alignItems: align,
        gap,
        padding: paddingMap[padding],
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
      }}
    >
      {children}
    </div>
  );
}
