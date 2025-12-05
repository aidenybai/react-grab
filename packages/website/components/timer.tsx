"use client";

import { useState, useEffect, useRef } from "react";

interface TimerProps {
  isRunning: boolean;
  startTime?: number;
  endTime?: number;
  maxDurationMs?: number;
}

const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const Timer = ({
  isRunning,
  startTime,
  endTime,
  maxDurationMs,
}: TimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!startTime) {
      return;
    }

    if (endTime) {
      const finalElapsed = endTime - startTime;
      if (finalElapsed !== elapsed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setElapsed(finalElapsed);
      }
      return;
    }

    if (isRunning) {
      const initialElapsed = Date.now() - startTime;
      if (initialElapsed !== elapsed) {
        setElapsed(initialElapsed);
      }

      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime, endTime, elapsed]);

  if (!startTime) return null;

  const clampedElapsed = maxDurationMs
    ? Math.min(elapsed, maxDurationMs)
    : elapsed;

  if (clampedElapsed < 1000) return null;

  return <span>{formatDuration(clampedElapsed)}</span>;
};

Timer.displayName = "Timer";
