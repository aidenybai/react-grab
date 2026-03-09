"use client";
import React from "react";

interface EditorButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
}

export const EditorButton = ({
  children,
  variant = "secondary",
  size = "md",
  onClick,
  disabled,
}: EditorButtonProps) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#2563eb", color: "#fff", border: "none" },
    secondary: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #e5e7eb",
    },
    ghost: { background: "transparent", color: "#6b7280", border: "none" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: size === "sm" ? "4px 8px" : "6px 12px",
        borderRadius: "4px",
        fontSize: size === "sm" ? "12px" : "13px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
};
