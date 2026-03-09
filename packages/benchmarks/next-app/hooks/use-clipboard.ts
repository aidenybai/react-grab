"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/clipboard";

export function useClipboard(resetAfterMs = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  error: Error | null;
} {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        const success = await copyToClipboard(text);
        if (success) {
          setCopied(true);
          setError(null);
          setTimeout(() => setCopied(false), resetAfterMs);
        } else {
          throw new Error("Copy failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Copy failed"));
        setCopied(false);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy, error };
}
