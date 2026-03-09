"use client";
import React, { useState } from "react";

type BannerVariant = "info" | "warning" | "error" | "success";

interface SystemBannerProps {
  message: string;
  variant?: BannerVariant;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantStyles: Record<
  BannerVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", icon: "i" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "!" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "x" },
  success: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    icon: "\u2713",
  },
};

export const SystemBanner = ({
  message,
  variant = "info",
  dismissible = true,
  action,
}: SystemBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const styles = variantStyles[variant];

  if (dismissed) return null;

  return (
    <div
      data-testid="deep-system-banner"
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: "8px",
        color: styles.text,
        fontSize: "14px",
      }}
    >
      <span
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: styles.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {styles.icon}
      </span>
      <p style={{ flex: 1, margin: 0 }}>{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: "4px 12px",
            borderRadius: "4px",
            border: `1px solid ${styles.border}`,
            background: "transparent",
            color: styles.text,
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {action.label}
        </button>
      )}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: styles.text,
            fontSize: "16px",
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          x
        </button>
      )}
    </div>
  );
};
