"use client";

import React from "react";

type BaseButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated";

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BaseButtonVariant;
  compact?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  ripple?: boolean;
}

const variantStyles: Record<BaseButtonVariant, React.CSSProperties> = {
  filled: { backgroundColor: "#6750A4", color: "#FFFFFF", border: "none" },
  tonal: { backgroundColor: "#E8DEF8", color: "#1D192B", border: "none" },
  outlined: {
    backgroundColor: "transparent",
    color: "#6750A4",
    border: "1px solid #79747E",
  },
  text: { backgroundColor: "transparent", color: "#6750A4", border: "none" },
  elevated: {
    backgroundColor: "#F7F2FA",
    color: "#6750A4",
    border: "none",
    boxShadow: "0 1px 3px 1px rgba(0,0,0,0.15)",
  },
};

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  (
    {
      variant = "filled",
      compact = false,
      startIcon,
      endIcon,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: compact ? 32 : 40,
          padding: compact ? "0 12px" : "0 24px",
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: 0.1,
          cursor: "pointer",
          transition: "all 200ms cubic-bezier(0.2, 0, 0, 1)",
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {startIcon}
        {children}
        {endIcon}
      </button>
    );
  },
);

BaseButton.displayName = "BaseButton";
