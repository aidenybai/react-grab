"use client";

import { useState, useCallback, useMemo } from "react";

export function useTimezone(initialTimezone?: string) {
  const [timezone, setTimezone] = useState(
    initialTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  const offset = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  }, [timezone]);

  const convertToTimezone = useCallback(
    (date: Date): string => {
      return date.toLocaleString("en-US", { timeZone: timezone });
    },
    [timezone],
  );

  return { timezone, setTimezone, offset, convertToTimezone };
}
