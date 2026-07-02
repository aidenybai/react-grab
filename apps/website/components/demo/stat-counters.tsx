"use client";

import { useEffect, useState } from "react";

const COUNT_UP_DURATION_MS = 1400;

interface StatDefinition {
  label: string;
  target: number;
  suffix: string;
}

const STATS: StatDefinition[] = [
  { label: "Elements grabbed", target: 12480, suffix: "" },
  { label: "Files located", target: 3211, suffix: "" },
  { label: "Time saved", target: 96, suffix: "%" },
];

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export const StatCounters = () => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    let frameId: number;
    const startedAt = performance.now();
    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / COUNT_UP_DURATION_MS, 1);
      setAnimationProgress(progress);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STATS.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 rounded-lg border border-line p-4">
          <span className="font-mono text-h2 tabular-nums text-title">
            {Math.round(stat.target * easeOutCubic(animationProgress)).toLocaleString("en-US")}
            {stat.suffix}
          </span>
          <span className="text-xs text-prose">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};

StatCounters.displayName = "StatCounters";
