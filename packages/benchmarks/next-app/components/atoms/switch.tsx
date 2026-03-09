"use client";

import React, { memo } from "react";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export const Switch = memo(function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  size = "md",
}: SwitchProps) {
  const trackW = size === "sm" ? 32 : 44;
  const trackH = size === "sm" ? 18 : 24;
  const thumbSize = size === "sm" ? 14 : 20;
  const thumbOffset = checked ? trackW - thumbSize - 2 : 2;

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: trackW,
          height: trackH,
          borderRadius: trackH / 2,
          backgroundColor: checked ? "#3B82F6" : "#D1D5DB",
          position: "relative",
          transition: "background-color 200ms ease",
        }}
      >
        <div
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            position: "absolute",
            top: 2,
            left: thumbOffset,
            transition: "left 200ms ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </div>
      {label && <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>}
    </label>
  );
});
