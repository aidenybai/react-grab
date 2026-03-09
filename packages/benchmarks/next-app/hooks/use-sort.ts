"use client";

import { useState, useMemo, useCallback } from "react";
import type { SortDirection } from "@/lib/types";

interface UseSortOptions<T> {
  items: T[];
  initialKey?: keyof T;
  initialDirection?: SortDirection;
}

export function useSort<T extends Record<string, unknown>>({
  items,
  initialKey,
  initialDirection = "asc",
}: UseSortOptions<T>) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initialKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDirection);

  const toggleSort = useCallback(
    (key: keyof T) => {
      if (sortKey === key) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection("asc");
      }
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return items;

    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [items, sortKey, sortDirection]);

  return {
    sorted,
    sortKey,
    sortDirection,
    toggleSort,
    setSortKey,
    setSortDirection,
  };
}
