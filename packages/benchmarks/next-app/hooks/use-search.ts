"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";

interface UseSearchOptions<T> {
  items: T[];
  searchKeys: (keyof T)[];
  debounceMs?: number;
}

export function useSearch<T extends Record<string, unknown>>({
  items,
  searchKeys,
  debounceMs = 300,
}: UseSearchOptions<T>) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, debounceMs);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return items;

    const lowerQuery = debouncedQuery.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerQuery);
        }
        if (typeof value === "number") {
          return String(value).includes(lowerQuery);
        }
        return false;
      }),
    );
  }, [items, searchKeys, debouncedQuery]);

  const clearSearch = () => setQuery("");

  return {
    query,
    setQuery,
    results,
    isSearching: debouncedQuery.trim().length > 0,
    resultCount: results.length,
    clearSearch,
  };
}
