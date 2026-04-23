/** @jsxImportSource react */
import { useEffect, useRef, useState } from "react";

const TIMER_INTERVAL_MS = 10;
const VELOCITY_PX = 3;
const HUE_SHIFT_DEG = 60;
const ANIMATION_FRAME_INTERVAL_MS = 16;

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
};

export const BouncingTimer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 50, y: 50 });
  const velocityRef = useRef({ x: VELOCITY_PX, y: VELOCITY_PX });
  const [hue, setHue] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedTime((previousTime) => previousTime + TIMER_INTERVAL_MS);
    }, TIMER_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const stepAnimation = () => {
      const containerElement = containerRef.current;
      const timerElement = timerRef.current;
      if (!containerElement || !timerElement) return;

      const containerRect = containerElement.getBoundingClientRect();
      const timerRect = timerElement.getBoundingClientRect();
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
        setHue((previousHue) => (previousHue + HUE_SHIFT_DEG) % 360);
      }
    };

    const intervalId = setInterval(stepAnimation, ANIMATION_FRAME_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      ref={containerRef}
      data-component="BouncingTimerContainer"
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <div
        ref={timerRef}
        data-component="BouncingTimer"
        style={{
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          fontSize: "72px",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          userSelect: "none",
          color: `hsl(${hue}, 100%, 50%)`,
          textShadow: `0 0 20px hsl(${hue}, 100%, 50%), 0 0 40px hsl(${hue}, 100%, 50%)`,
          transition: "color 300ms, text-shadow 300ms",
        }}
      >
        {formatTime(elapsedTime)}
      </div>
    </div>
  );
};
