"use client";

import { useState } from "react";

interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "paypal";
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface PaymentMethodSelectProps {
  methods: PaymentMethod[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onAddNew?: () => void;
}

export function PaymentMethodSelect({
  methods,
  selectedId,
  onSelect,
  onAddNew,
}: PaymentMethodSelectProps) {
  return (
    <div className="payment-method-select">
      <label className="payment-method-select__label">Payment Method</label>
      <div className="payment-method-select__list">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`payment-method-select__item ${selectedId === method.id ? "payment-method-select__item--selected" : ""}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedId === method.id}
              onChange={() => onSelect?.(method.id)}
            />
            <span className="payment-method-select__brand">
              {method.brand ?? method.type}
            </span>
            {method.last4 && (
              <span className="payment-method-select__last4">
                ****{method.last4}
              </span>
            )}
            {method.expiryMonth && (
              <span className="payment-method-select__expiry">
                {method.expiryMonth}/{method.expiryYear}
              </span>
            )}
            {method.isDefault && (
              <span className="payment-method-select__default">Default</span>
            )}
          </label>
        ))}
      </div>
      <button className="btn btn-sm btn-outline" onClick={onAddNew}>
        Add Payment Method
      </button>
    </div>
  );
}
