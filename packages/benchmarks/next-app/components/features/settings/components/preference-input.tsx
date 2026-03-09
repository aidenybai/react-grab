"use client";
import React from "react";

interface PreferenceInputProps {
  label: string;
  description?: string;
  type?: "text" | "toggle" | "select";
  value: string | boolean;
  options?: { label: string; value: string }[];
  onChange: (value: string | boolean) => void;
}

export const PreferenceInput = ({
  label,
  description,
  type = "text",
  value,
  options,
  onChange,
}: PreferenceInputProps) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #f3f4f6",
    }}
  >
    <div>
      <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>{label}</p>
      {description && (
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>
          {description}
        </p>
      )}
    </div>
    {type === "text" && (
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: "4px",
          border: "1px solid #d1d5db",
          fontSize: "13px",
          width: "200px",
        }}
      />
    )}
    {type === "toggle" && (
      <button
        onClick={() => onChange(!value)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "12px",
          border: "none",
          background: value ? "#2563eb" : "#d1d5db",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <span
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: "3px",
            left: value ? "23px" : "3px",
            transition: "left 150ms ease",
          }}
        />
      </button>
    )}
    {type === "select" && options && (
      <select
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: "4px",
          border: "1px solid #d1d5db",
          fontSize: "13px",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )}
  </div>
);
