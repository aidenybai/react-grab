import type React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface IconLoaderProps {
  size?: number;
  className?: string;
}

export const IconLoader: React.FC<IconLoaderProps> = ({ size = 16, className }) => {
  const frame = useCurrentFrame();

  // Compute spinner rotation from frame via interpolate()
  // Full 360° rotation every 24 frames (0.6s at 40fps)
  const cycleLength = 24;
  const cycleFrame = frame % cycleLength;
  const rotation = interpolate(cycleFrame, [0, cycleLength], [0, 360]);

  // 12 bars with static graduated opacity (leading bar brightest, trailing fades)
  const bars = [
    { opacity: 1, d: "M12 2v4" },
    { opacity: 0.93, d: "M15 6.8l2-3.5" },
    { opacity: 0.85, d: "M17.2 9l3.5-2" },
    { opacity: 0.77, d: "M18 12h4" },
    { opacity: 0.69, d: "M17.2 15l3.5 2" },
    { opacity: 0.62, d: "M15 17.2l2 3.5" },
    { opacity: 0.54, d: "M12 18v4" },
    { opacity: 0.46, d: "M9 17.2l-2 3.5" },
    { opacity: 0.38, d: "M6.8 15l-3.5 2" },
    { opacity: 0.31, d: "M2 12h4" },
    { opacity: 0.23, d: "M6.8 9l-3.5-2" },
    { opacity: 0.15, d: "M9 6.8l-2-3.5" },
  ];

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
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {bars.map((bar, i) => (
        <path
          key={i}
          d={bar.d}
          style={{ opacity: bar.opacity }}
        />
      ))}
    </svg>
  );
};
