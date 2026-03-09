"use client";

import { useState, useCallback } from "react";

export function useToggle(
  initialValue = false,
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((v: boolean) => setValue(v), []);

  return [value, toggle, set];
}

export function useMultiToggle<K extends string>(
  keys: K[],
  initialState?: Partial<Record<K, boolean>>,
): {
  state: Record<K, boolean>;
  toggle: (key: K) => void;
  set: (key: K, value: boolean) => void;
  reset: () => void;
} {
  const getInitial = (): Record<K, boolean> => {
    const result = {} as Record<K, boolean>;
    for (const key of keys) {
      result[key] = initialState?.[key] ?? false;
    }
    return result;
  };

  const [state, setState] = useState<Record<K, boolean>>(getInitial);

  const toggle = useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const set = useCallback((key: K, value: boolean) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setState(getInitial()), []);

  return { state, toggle, set, reset };
}
