"use client";

import { useState } from "react";

interface PaymentConfigProps {
  enabled: boolean;
  amount?: number;
  currency?: string;
  collectOnBooking?: boolean;
  onChange?: (config: {
    enabled: boolean;
    amount: number;
    currency: string;
    collectOnBooking: boolean;
  }) => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export function PaymentConfig({
  enabled,
  amount = 0,
  currency = "USD",
  collectOnBooking = true,
  onChange,
}: PaymentConfigProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [payAmount, setPayAmount] = useState(amount);
  const [payCurrency, setPayCurrency] = useState(currency);
  const [collect, setCollect] = useState(collectOnBooking);

  const handleToggle = () => {
    const next = !isEnabled;
    setIsEnabled(next);
    onChange?.({
      enabled: next,
      amount: payAmount,
      currency: payCurrency,
      collectOnBooking: collect,
    });
  };

  return (
    <div className="payment-config">
      <label className="payment-config__toggle">
        <input type="checkbox" checked={isEnabled} onChange={handleToggle} />
        Require payment
      </label>
      {isEnabled && (
        <div className="payment-config__options">
          <div className="payment-config__field">
            <label>Amount</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>
          <div className="payment-config__field">
            <label>Currency</label>
            <select
              value={payCurrency}
              onChange={(e) => setPayCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label>
            <input
              type="checkbox"
              checked={collect}
              onChange={(e) => setCollect(e.target.checked)}
            />
            Collect payment during booking
          </label>
        </div>
      )}
    </div>
  );
}
