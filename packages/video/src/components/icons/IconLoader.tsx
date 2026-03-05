import type React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface IconLoaderProps {
  size?: number;
  className?: string;
}

export const IconLoader: React.FC<IconLoaderProps> = ({ size = 16, className }) => {
  const frame = useCurrentFrame();

  // 12 bars, each bar's opacity is driven by frame to simulate spinner rotation
  const bars = [
    { delay: 0, d: "M12 2v4" },
    { delay: 1, d: "M15 6.8l2-3.5" },
    { delay: 2, d: "M17.2 9l3.5-2" },
    { delay: 3, d: "M18 12h4" },
    { delay: 4, d: "M17.2 15l3.5 2" },
    { delay: 5, d: "M15 17.2l2 3.5" },
    { delay: 6, d: "M12 18v4" },
    { delay: 7, d: "M9 17.2l-2 3.5" },
    { delay: 8, d: "M6.8 15l-3.5 2" },
    { delay: 9, d: "M2 12h4" },
    { delay: 10, d: "M6.8 9l-3.5-2" },
    { delay: 11, d: "M9 6.8l-2-3.5" },
  ];

  // Complete rotation every 24 frames (0.6s at 40fps)
  const cycleLength = 24;
  const activeIndex = Math.floor(frame / (cycleLength / 12)) % 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {bars.map((bar) => {
        // Each bar fades: fully opaque when active, fading out as distance increases
        const distance = (bar.delay - activeIndex + 12) % 12;
        const opacity = interpolate(distance, [0, 11], [1, 0.15]);
        return (
          <path
            key={bar.delay}
            d={bar.d}
            style={{ opacity }}
          />
        );
      })}
    </svg>
  );
};
