"use client";

import React, { useEffect, useRef } from "react";

type DialogVariant = "info" | "warning" | "error" | "success" | "confirm";

interface FeedbackDialogProps {
  variant?: DialogVariant;
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

const variantIcons: Record<DialogVariant, string> = {
  info: "\u2139\uFE0F",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
  success: "\u2705",
  confirm: "\u2753",
};

export function Dialog({
  variant = "info",
  open,
  onClose,
  title,
  message,
  primaryAction,
  secondaryAction,
}: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        style={{
          position: "relative",
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>
          {variantIcons[variant]}
        </div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "#6B7280",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                padding: "8px 16px",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {secondaryAction.label}
            </button>
          )}
          <button
            onClick={primaryAction?.onClick || onClose}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              backgroundColor: "#3B82F6",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {primaryAction?.label || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
