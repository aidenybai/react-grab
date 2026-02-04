"use client";

import { useEffect, useRef, useState } from "react";

const TIMER_INTERVAL_MS = 10;
const VELOCITY_PX = 3;

const BouncingTimer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 50, y: 50 });
  const velocityRef = useRef({ x: VELOCITY_PX, y: VELOCITY_PX });
  const [hue, setHue] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((previousTime) => previousTime + TIMER_INTERVAL_MS);
    }, TIMER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animationFrame = () => {
      const container = containerRef.current;
      const timer = timerRef.current;
      if (!container || !timer) return;

      const containerRect = container.getBoundingClientRect();
      const timerRect = timer.getBoundingClientRect();

      const maxX = containerRect.width - timerRect.width;
      const maxY = containerRect.height - timerRect.height;

      let nextX = positionRef.current.x + velocityRef.current.x;
      let nextY = positionRef.current.y + velocityRef.current.y;

      let didBounce = false;

      if (nextX <= 0 || nextX >= maxX) {
        velocityRef.current.x *= -1;
        nextX = Math.max(0, Math.min(nextX, maxX));
        didBounce = true;
      }

      if (nextY <= 0 || nextY >= maxY) {
        velocityRef.current.y *= -1;
        nextY = Math.max(0, Math.min(nextY, maxY));
        didBounce = true;
      }

      positionRef.current = { x: nextX, y: nextY };
      setPosition({ x: nextX, y: nextY });

      if (didBounce) {
        setHue((previousHue) => (previousHue + 60) % 360);
      }
    };

    const interval = setInterval(animationFrame, 16);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
    >
      <div
        ref={timerRef}
        className="absolute select-none text-6xl font-bold tabular-nums transition-colors duration-300 md:text-8xl"
        style={{
          left: position.x,
          top: position.y,
          color: `hsl(${hue}, 100%, 50%)`,
          textShadow: `0 0 20px hsl(${hue}, 100%, 50%), 0 0 40px hsl(${hue}, 100%, 50%)`,
        }}
      >
        {formatTime(elapsedTime)}
      </div>
    </div>
  );
};

export default function FreezeDemoPage() {
  return (
    <div className="h-screen w-screen">
      <BouncingTimer />
    </div>
  );
}
