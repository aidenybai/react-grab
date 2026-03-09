"use client";

import { useState, useMemo, useCallback } from "react";

interface UseFilterOptions<T> {
  items: T[];
  initialFilters?: Record<string, unknown>;
}

export function useFilter<T extends Record<string, unknown>>({
  items,
  initialFilters = {},
}: UseFilterOptions<T>) {
  const [filters, setFilters] =
    useState<Record<string, unknown>>(initialFilters);

  const setFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => {
      if (value === undefined || value === null || value === "") {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);

  const filtered = useMemo(() => {
    const activeFilters = Object.entries(filters);
    if (activeFilters.length === 0) return items;

    return items.filter((item) =>
      activeFilters.every(([key, filterValue]) => {
        const itemValue = item[key];
        if (Array.isArray(filterValue)) {
          return filterValue.includes(itemValue);
        }
        return itemValue === filterValue;
      }),
    );
  }, [items, filters]);

  const activeFilterCount = Object.keys(filters).length;

  return {
    filtered,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
