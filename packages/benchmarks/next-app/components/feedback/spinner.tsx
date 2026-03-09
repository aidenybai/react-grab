"use client";

import React from "react";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
  label?: string;
  centered?: boolean;
}

export function Spinner({
  size = "md",
  color = "#3B82F6",
  label,
  centered = false,
}: SpinnerProps) {
  const sizeValues = { xs: 14, sm: 18, md: 24, lg: 36 };
  const dimension = sizeValues[size];
  const strokeWidth = size === "xs" ? 2 : size === "sm" ? 2.5 : 3;

  const spinner = (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spin 1s linear infinite" }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.25}
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span
          style={{
            fontSize: size === "xs" || size === "sm" ? 11 : 13,
            color: "#6B7280",
          }}
        >
          {label}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (centered) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
