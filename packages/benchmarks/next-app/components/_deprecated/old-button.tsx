"use client";

import React, { ButtonHTMLAttributes } from "react";

type OldButtonVariant = "primary" | "secondary" | "danger" | "text";

interface OldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OldButtonVariant;
  size?: "small" | "medium" | "large";
  loading?: boolean;
  block?: boolean;
}

const variantStyles: Record<OldButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
  },
  secondary: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  danger: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
  },
  text: {
    backgroundColor: "transparent",
    color: "#4f46e5",
    border: "none",
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { padding: "4px 12px", fontSize: "12px" },
  medium: { padding: "8px 16px", fontSize: "14px" },
  large: { padding: "12px 24px", fontSize: "16px" },
};

export function OldButton({
  variant = "primary",
  size = "medium",
  loading = false,
  block = false,
  children,
  disabled,
  style,
  ...props
}: OldButtonProps) {
  const buttonStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: "6px",
    fontWeight: 500,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.5 : 1,
    display: block ? "block" : "inline-flex",
    width: block ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "opacity 0.15s ease",
    ...style,
  };

  return (
    <button style={buttonStyle} disabled={disabled || loading} {...props}>
      {loading && (
        <span
          style={{
            display: "inline-block",
            animation: "spin 1s linear infinite",
          }}
        >
          &#8987;
        </span>
      )}
      {children}
    </button>
  );
}

export default OldButton;
