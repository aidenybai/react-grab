"use client";

import React, { useState } from "react";

type InputVariant = "outlined" | "filled";

interface BaseInputProps {
  variant?: InputVariant;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  supportingText?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
}

export function BaseInput({
  variant = "outlined",
  label,
  value = "",
  onChange,
  supportingText,
  errorText,
  leadingIcon,
  trailingIcon,
  disabled = false,
}: BaseInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!errorText;
  const borderColor = hasError ? "#B3261E" : focused ? "#6750A4" : "#79747E";

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 56,
          borderRadius: variant === "filled" ? "4px 4px 0 0" : 4,
          border:
            variant === "outlined"
              ? `${focused ? 2 : 1}px solid ${borderColor}`
              : "none",
          borderBottom:
            variant === "filled"
              ? `${focused ? 2 : 1}px solid ${borderColor}`
              : undefined,
          backgroundColor: variant === "filled" ? "#E7E0EC" : "transparent",
          padding: "0 16px",
          gap: 12,
          opacity: disabled ? 0.38 : 1,
        }}
      >
        {leadingIcon}
        <div style={{ flex: 1, position: "relative", paddingTop: 8 }}>
          <label
            style={{
              position: "absolute",
              top: focused || value ? 0 : 14,
              fontSize: focused || value ? 12 : 16,
              color: hasError ? "#B3261E" : focused ? "#6750A4" : "#49454F",
              transition: "all 150ms ease",
              pointerEvents: "none",
            }}
          >
            {label}
          </label>
          <input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontSize: 16,
              color: "#1C1B1F",
              padding: 0,
              marginTop: 4,
            }}
          />
        </div>
        {trailingIcon}
      </div>
      {(supportingText || errorText) && (
        <div
          style={{
            padding: "4px 16px 0",
            fontSize: 12,
            color: hasError ? "#B3261E" : "#49454F",
          }}
        >
          {errorText || supportingText}
        </div>
      )}
    </div>
  );
}
