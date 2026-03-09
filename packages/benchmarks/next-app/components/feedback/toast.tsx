"use client";

import React, { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void };
}

const toastStyles: Record<
  ToastType,
  { bg: string; border: string; text: string }
> = {
  success: { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
  error: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
  warning: { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E" },
  info: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
};

export function Toast({
  message,
  type = "info",
  duration = 5000,
  onDismiss,
  action,
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const styles = toastStyles[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 8,
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        fontSize: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "all 300ms ease",
        maxWidth: 400,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            color: styles.text,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: styles.text,
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        &times;
      </button>
    </div>
  );
}
