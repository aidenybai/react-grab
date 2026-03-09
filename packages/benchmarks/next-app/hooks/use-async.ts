"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = true,
): AsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setState({ data: null, error: null, isLoading: true });
    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, error: null, isLoading: false });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
          isLoading: false,
        });
      }
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}
