"use client";
import React from "react";

type Variant = "default" | "destructive" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface PrimaryActionProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: { background: "#2563eb", color: "#fff", border: "none" },
  destructive: { background: "#dc2626", color: "#fff", border: "none" },
  outline: {
    background: "transparent",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  ghost: { background: "transparent", color: "#374151", border: "none" },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "13px" },
  md: { padding: "8px 16px", fontSize: "14px" },
  lg: { padding: "10px 20px", fontSize: "16px" },
};

export const PrimaryAction = ({
  children,
  variant = "default",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
}: PrimaryActionProps) => (
  <button
    data-testid="barrel-primary-action"
    disabled={disabled || loading}
    onClick={onClick}
    style={{
      ...variantStyles[variant],
      ...sizeStyles[size],
      borderRadius: "6px",
      fontWeight: 500,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      transition: "opacity 150ms ease",
    }}
  >
    {loading && (
      <span
        style={{
          width: "14px",
          height: "14px",
          border: "2px solid currentColor",
          borderTopColor: "transparent",
          borderRadius: "50%",
          display: "inline-block",
          animation: "spin 0.6s linear infinite",
        }}
      />
    )}
    {children}
  </button>
);
