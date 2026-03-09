"use client";

import { useState, useCallback, useMemo } from "react";

interface DateRange {
  start: Date;
  end: Date;
}

export function useDateRange(initialRange?: DateRange) {
  const [range, setRange] = useState<DateRange>(
    initialRange ?? { start: new Date(), end: new Date() },
  );

  const setStart = useCallback((date: Date) => {
    setRange((prev) => ({ ...prev, start: date }));
  }, []);

  const setEnd = useCallback((date: Date) => {
    setRange((prev) => ({ ...prev, end: date }));
  }, []);

  const dayCount = useMemo(() => {
    const diff = range.end.getTime() - range.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [range]);

  const isValid = useMemo(() => range.start <= range.end, [range]);

  return { range, setRange, setStart, setEnd, dayCount, isValid };
}
