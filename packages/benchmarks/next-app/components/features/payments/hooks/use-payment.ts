"use client";

import { useState, useCallback } from "react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  description: string;
}

export function usePayment() {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (amount: number, currency: string, paymentMethodId: string) => {
      setIsProcessing(true);
      setError(null);
      try {
        setPayment({
          id: `pay_${Date.now()}`,
          amount,
          currency,
          status: "paid",
          description: "Payment processed",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const refund = useCallback(async (amount: number) => {
    setPayment((prev) => (prev ? { ...prev, status: "refunded" } : null));
  }, []);

  return { payment, isProcessing, error, processPayment, refund };
}
