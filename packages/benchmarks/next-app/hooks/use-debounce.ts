"use client";

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delayMs: number,
): T {
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    setTimeoutId(setTimeout(() => callback(...args), delayMs));
  }) as T;
}
