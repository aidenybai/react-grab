"use client";

import { useRef, useEffect } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousDefined<T>(value: T): T {
  const ref = useRef<T>(value);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      ref.current = value;
    }
  }, [value]);

  return ref.current;
}
