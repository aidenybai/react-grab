"use client";

import { useEffect, useState } from "react";

const COUNTER_INTERVAL_MS = 100;

export const Counter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((previousCount) => previousCount + 1);
    }, COUNTER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <div className="text-sm font-medium text-muted-foreground">Counter</div>
        <div className="text-2xl font-bold tabular-nums">{count}</div>
      </div>
    </div>
  );
};
