"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { TIMER_UPDATE_INTERVAL_MS } from "@/constants";

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
}: TimerProps): ReactElement | null => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!startTime) return;

    if (endTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(endTime - startTime);
      return;
    }

    if (isRunning) {
      setElapsed(Date.now() - startTime);
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, TIMER_UPDATE_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime, endTime]);

  if (!startTime) return null;

  const clampedElapsed = maxDurationMs
    ? Math.min(elapsed, maxDurationMs)
    : elapsed;

  if (clampedElapsed < 1000) return null;

  return <span>{formatDuration(clampedElapsed)}</span>;
};

Timer.displayName = "Timer";
