"use client";
import React, { useState, useCallback } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialogContent = ({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div
    data-testid="hook-confirm-dialog"
    style={{
      padding: "24px",
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      maxWidth: "400px",
    }}
  >
    <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
      {title}
    </h2>
    <p style={{ color: "#6b7280", marginBottom: "16px" }}>{message}</p>
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
      <button
        onClick={onCancel}
        style={{
          padding: "8px 16px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
        }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        style={{
          padding: "8px 16px",
          borderRadius: "6px",
          background: "#ef4444",
          color: "#fff",
          border: "none",
        }}
      >
        Confirm
      </button>
    </div>
  </div>
);

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close, ConfirmDialogContent };
};
