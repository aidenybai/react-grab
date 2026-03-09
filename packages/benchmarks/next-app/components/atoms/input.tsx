"use client";

import React, { memo, useState } from "react";

interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  errorMessage?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "number" | "url";
  autoFocus?: boolean;
}

export const Input = memo(function Input({
  value,
  onChange,
  placeholder,
  label,
  errorMessage,
  disabled = false,
  type = "text",
  autoFocus = false,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 36,
          padding: "0 12px",
          fontSize: 14,
          border: `1px solid ${errorMessage ? "#EF4444" : focused ? "#3B82F6" : "#D1D5DB"}`,
          borderRadius: 6,
          outline: "none",
          backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
          color: disabled ? "#9CA3AF" : "#111827",
          transition: "border-color 150ms ease",
        }}
      />
      {errorMessage && (
        <span style={{ fontSize: 12, color: "#EF4444" }}>{errorMessage}</span>
      )}
    </div>
  );
});
