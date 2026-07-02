"use client";

import { useEffect, useState } from "react";
import { PingDot } from "@/components/demo/ping-dot";

const CLOCK_TICK_MS = 1000;

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const LiveClock = () => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line p-4">
      <span className="font-mono text-xs uppercase tracking-widest text-faint">Local time</span>
      <span className="font-mono text-h2 tabular-nums text-title">
        {now ? formatTime(now) : "--:--:--"}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-prose">
        <PingDot />
        Updating every second
      </span>
    </div>
  );
};

LiveClock.displayName = "LiveClock";
