"use client";
import { useState, useCallback } from "react";

interface Booking {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: "pending" | "confirmed" | "cancelled";
}

export const useBooking = (initialBooking?: Booking) => {
  const [booking, setBooking] = useState<Booking | null>(
    initialBooking ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback(async () => {
    if (!booking) return;
    setLoading(true);
    setError(null);
    try {
      setBooking({ ...booking, status: "confirmed" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setLoading(false);
    }
  }, [booking]);

  const cancel = useCallback(async () => {
    if (!booking) return;
    setLoading(true);
    try {
      setBooking({ ...booking, status: "cancelled" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setLoading(false);
    }
  }, [booking]);

  return { booking, loading, error, confirm, cancel, setBooking };
};
