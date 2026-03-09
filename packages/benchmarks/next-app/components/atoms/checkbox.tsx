"use client";

import React, { memo } from "react";

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  description?: string;
}

export const Checkbox = memo(function Checkbox({
  checked = false,
  onChange,
  label,
  indeterminate = false,
  disabled = false,
  description,
}: CheckboxProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `2px solid ${checked || indeterminate ? "#3B82F6" : "#D1D5DB"}`,
          backgroundColor: checked || indeterminate ? "#3B82F6" : "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "all 150ms ease",
        }}
      >
        {checked && (
          <span style={{ color: "#FFFFFF", fontSize: 12, lineHeight: 1 }}>
            &#10003;
          </span>
        )}
        {indeterminate && !checked && (
          <span style={{ color: "#FFFFFF", fontSize: 14 }}>&mdash;</span>
        )}
      </div>
      {(label || description) && (
        <div>
          {label && (
            <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
              {label}
            </span>
          )}
          {description && (
            <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
});
