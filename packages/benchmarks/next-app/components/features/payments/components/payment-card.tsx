"use client";

import { memo } from "react";

interface PaymentCardProps {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  date: string;
  description: string;
  customerName?: string;
  onRefund?: () => void;
}

const statusStyles: Record<string, { color: string; bg: string }> = {
  paid: { color: "#065f46", bg: "#d1fae5" },
  pending: { color: "#92400e", bg: "#fef3c7" },
  failed: { color: "#991b1b", bg: "#fee2e2" },
  refunded: { color: "#6b7280", bg: "#f3f4f6" },
};

export const PaymentCard = memo(function PaymentCard({
  id,
  amount,
  currency,
  status,
  date,
  description,
  customerName,
  onRefund,
}: PaymentCardProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
  const style = statusStyles[status] ?? statusStyles.pending;

  return (
    <div className="payment-card">
      <div className="payment-card__header">
        <span className="payment-card__amount">{formatted}</span>
        <span
          className="payment-card__status"
          style={{
            color: style.color,
            backgroundColor: style.bg,
            padding: "2px 8px",
            borderRadius: 9999,
            fontSize: 12,
          }}
        >
          {status}
        </span>
      </div>
      <p className="payment-card__desc">{description}</p>
      {customerName && <p className="payment-card__customer">{customerName}</p>}
      <p className="payment-card__date">{date}</p>
      {status === "paid" && onRefund && (
        <button className="btn btn-sm btn-outline" onClick={onRefund}>
          Refund
        </button>
      )}
    </div>
  );
});
