"use client";

import { useState, useCallback } from "react";

interface Subscription {
  id: string;
  plan: string;
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const changePlan = useCallback(async (planId: string) => {
    setIsLoading(true);
    try {
      setSubscription((prev) => (prev ? { ...prev, plan: planId } : null));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    setSubscription((prev) =>
      prev ? { ...prev, cancelAtPeriodEnd: true } : null,
    );
  }, []);

  const resume = useCallback(async () => {
    setSubscription((prev) =>
      prev ? { ...prev, cancelAtPeriodEnd: false } : null,
    );
  }, []);

  return { subscription, isLoading, changePlan, cancel, resume };
}
