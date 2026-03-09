"use client";

import React, { useEffect } from "react";

interface BaseDialogProps {
  open: boolean;
  onDismiss: () => void;
  icon?: React.ReactNode;
  headline: string;
  supportingText?: string;
  confirmLabel?: string;
  dismissLabel?: string;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

export function BaseDialog({
  open,
  onDismiss,
  icon,
  headline,
  supportingText,
  confirmLabel = "OK",
  dismissLabel = "Cancel",
  onConfirm,
  children,
}: BaseDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.32)",
        }}
      />
      <div
        role="dialog"
        style={{
          position: "relative",
          minWidth: 280,
          maxWidth: 560,
          borderRadius: 28,
          backgroundColor: "#ECE6F0",
          padding: 24,
        }}
      >
        {icon && (
          <div
            style={{ textAlign: "center", marginBottom: 16, color: "#6750A4" }}
          >
            {icon}
          </div>
        )}
        <h2
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: "#1C1B1F",
            textAlign: icon ? "center" : "left",
            margin: 0,
          }}
        >
          {headline}
        </h2>
        {supportingText && (
          <p style={{ fontSize: 14, color: "#49454F", marginTop: 16 }}>
            {supportingText}
          </p>
        )}
        {children && <div style={{ marginTop: 16 }}>{children}</div>}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 24,
          }}
        >
          <button
            onClick={onDismiss}
            style={{
              padding: "10px 12px",
              border: "none",
              background: "none",
              color: "#6750A4",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: 20,
            }}
          >
            {dismissLabel}
          </button>
          <button
            onClick={onConfirm || onDismiss}
            style={{
              padding: "10px 12px",
              border: "none",
              background: "none",
              color: "#6750A4",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: 20,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
