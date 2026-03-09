"use client";

import { useState } from "react";

interface RefundDialogProps {
  isOpen: boolean;
  paymentId: string;
  amount: number;
  currency: string;
  onRefund: (amount: number, reason: string) => void;
  onClose: () => void;
}

export function RefundDialog({
  isOpen,
  paymentId,
  amount,
  currency,
  onRefund,
  onClose,
}: RefundDialogProps) {
  const [refundAmount, setRefundAmount] = useState(amount);
  const [reason, setReason] = useState("");
  const [isFullRefund, setIsFullRefund] = useState(true);

  if (!isOpen) return null;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);

  return (
    <div className="refund-dialog__overlay" onClick={onClose}>
      <div className="refund-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Issue Refund</h2>
        <p>Original payment: {formatted}</p>
        <label>
          <input
            type="radio"
            checked={isFullRefund}
            onChange={() => setIsFullRefund(true)}
          />
          Full refund ({formatted})
        </label>
        <label>
          <input
            type="radio"
            checked={!isFullRefund}
            onChange={() => setIsFullRefund(false)}
          />
          Partial refund
        </label>
        {!isFullRefund && (
          <div className="refund-dialog__field">
            <label>Amount ({currency})</label>
            <input
              type="number"
              value={refundAmount / 100}
              onChange={(e) =>
                setRefundAmount(Math.round(Number(e.target.value) * 100))
              }
              min={0}
              max={amount / 100}
              step={0.01}
            />
          </div>
        )}
        <div className="refund-dialog__field">
          <label>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund"
            rows={3}
          />
        </div>
        <div className="refund-dialog__actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() =>
              onRefund(isFullRefund ? amount : refundAmount, reason)
            }
          >
            Issue Refund
          </button>
        </div>
      </div>
    </div>
  );
}
