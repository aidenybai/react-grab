"use client";
import React, { useState } from "react";

interface ConfirmBookingButtonProps {
  bookingId: string;
  onConfirm?: (bookingId: string) => Promise<void> | void;
  disabled?: boolean;
  requiresPayment?: boolean;
}

export const ConfirmBookingButton = ({
  bookingId,
  onConfirm,
  disabled = false,
  requiresPayment = false,
}: ConfirmBookingButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleClick = async () => {
    if (loading || confirmed || disabled) return;
    setLoading(true);
    try {
      await onConfirm?.(bookingId);
      setConfirmed(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      data-testid="deep-confirm-booking"
      onClick={handleClick}
      disabled={disabled || loading || confirmed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        border: "none",
        cursor: disabled || loading || confirmed ? "not-allowed" : "pointer",
        background: confirmed ? "#10b981" : disabled ? "#e5e7eb" : "#2563eb",
        color: confirmed ? "#fff" : disabled ? "#9ca3af" : "#fff",
        opacity: loading ? 0.7 : 1,
        transition: "all 150ms ease",
      }}
    >
      {loading && (
        <span
          style={{
            width: "16px",
            height: "16px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.6s linear infinite",
          }}
        />
      )}
      {confirmed
        ? "Booking Confirmed"
        : loading
          ? "Confirming..."
          : requiresPayment
            ? "Confirm & Pay"
            : "Confirm Booking"}
    </button>
  );
};
