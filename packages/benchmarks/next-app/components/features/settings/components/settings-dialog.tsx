"use client";
import React from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
}

export const SettingsDialog = ({
  isOpen,
  onClose,
  title,
  children,
  onSave,
}: SettingsDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          {title}
        </h2>
        <div style={{ marginBottom: "20px" }}>{children}</div>
        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {onSave && (
            <button
              onClick={onSave}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
