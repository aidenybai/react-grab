"use client";
import React, { useState, useCallback } from "react";

interface DisplayNameFieldProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}

const validateDisplayName = (value: string): string | null => {
  if (value.length === 0) return "Display name is required";
  if (value.length < 2) return "Must be at least 2 characters";
  if (value.length > 50) return "Must be 50 characters or fewer";
  if (/^\s|\s$/.test(value)) return "Cannot start or end with spaces";
  if (/[<>&"']/.test(value)) return "Contains invalid characters";
  return null;
};

export const DisplayNameField = ({
  initialValue = "",
  onChange,
  maxLength = 50,
  required = true,
}: DisplayNameFieldProps) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue.length > maxLength) return;
      setValue(newValue);
      onChange?.(newValue);
      if (touched) {
        setError(validateDisplayName(newValue));
      }
    },
    [maxLength, onChange, touched],
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(validateDisplayName(value));
  }, [value]);

  return (
    <div
      data-testid="deep-display-name-field"
      style={{ display: "flex", flexDirection: "column", gap: "4px" }}
    >
      <label
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        Display Name
        {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter your display name"
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: `1px solid ${error && touched ? "#fca5a5" : "#d1d5db"}`,
          fontSize: "14px",
          outline: "none",
          transition: "border-color 150ms ease",
          background: error && touched ? "#fef2f2" : "#fff",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {error && touched ? (
          <span style={{ fontSize: "12px", color: "#ef4444" }}>{error}</span>
        ) : (
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>
            How others will see your name
          </span>
        )}
        <span
          style={{
            fontSize: "11px",
            color: value.length > maxLength * 0.9 ? "#f59e0b" : "#9ca3af",
          }}
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
};
