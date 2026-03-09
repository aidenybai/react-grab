"use client";

import React, { memo } from "react";

type ButtonIntent = "primary" | "secondary" | "danger" | "neutral";
type ButtonScale = "compact" | "default" | "large";

interface ButtonProps {
  intent?: ButtonIntent;
  scale?: ButtonScale;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  children: React.ReactNode;
}

const intentColors: Record<
  ButtonIntent,
  { bg: string; color: string; hoverBg: string }
> = {
  primary: { bg: "#0066FF", color: "#FFFFFF", hoverBg: "#0052CC" },
  secondary: { bg: "#F0F0F0", color: "#333333", hoverBg: "#E0E0E0" },
  danger: { bg: "#DC3545", color: "#FFFFFF", hoverBg: "#C82333" },
  neutral: { bg: "transparent", color: "#666666", hoverBg: "#F5F5F5" },
};

const scaleSizes: Record<
  ButtonScale,
  { height: number; padding: string; fontSize: number }
> = {
  compact: { height: 28, padding: "0 8px", fontSize: 12 },
  default: { height: 36, padding: "0 16px", fontSize: 14 },
  large: { height: 44, padding: "0 24px", fontSize: 16 },
};

export const Button = memo(function Button({
  intent = "primary",
  scale = "default",
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const colors = intentColors[intent];
  const sizes = scaleSizes[scale];

  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: sizes.height,
        padding: sizes.padding,
        fontSize: sizes.fontSize,
        fontWeight: 500,
        backgroundColor: disabled ? "#CCCCCC" : colors.bg,
        color: disabled ? "#999999" : colors.color,
        border: "none",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : "auto",
        transition: "background-color 150ms ease",
      }}
      disabled={disabled}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
