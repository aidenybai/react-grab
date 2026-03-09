"use client";

import { useState, useCallback } from "react";

interface PaymentFormProps {
  amount: number;
  currency: string;
  onSubmit: (paymentMethod: string) => void;
  isLoading?: boolean;
}

export function PaymentForm({
  amount,
  currency,
  onSubmit,
  isLoading,
}: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(`card_${Date.now()}`);
    },
    [onSubmit],
  );

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <h3 className="payment-form__amount">Pay {formatted}</h3>
      <div className="payment-form__field">
        <label>Name on Card</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="payment-form__field">
        <label>Card Number</label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          maxLength={19}
          required
          placeholder="1234 5678 9012 3456"
        />
      </div>
      <div className="payment-form__row">
        <div className="payment-form__field">
          <label>Expiry</label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="MM/YY"
            maxLength={5}
            required
          />
        </div>
        <div className="payment-form__field">
          <label>CVC</label>
          <input
            type="text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            maxLength={4}
            required
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Processing..." : `Pay ${formatted}`}
      </button>
    </form>
  );
}
