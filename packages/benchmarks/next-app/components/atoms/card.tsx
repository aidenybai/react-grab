"use client";

import React, { memo } from "react";

interface CardProps {
  padding?: number;
  radius?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  border?: boolean;
  background?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const shadowMap = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1)",
};

export const Card = memo(function Card({
  padding = 16,
  radius = 8,
  shadow = "sm",
  border = true,
  background = "#FFFFFF",
  children,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding,
        borderRadius: radius,
        boxShadow: shadowMap[shadow],
        border: border ? "1px solid #E5E7EB" : "none",
        backgroundColor: background,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
});
