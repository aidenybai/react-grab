"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

interface BenchmarkTooltipProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const CONTROL_SECONDS = 16.8;
const TREATMENT_SECONDS = 5.8;
const MAX_SECONDS = 20;
const DURATION_CHANGE = "3";

interface MiniBarProps {
  targetSeconds: number;
  maxSeconds: number;
  color: string;
  label: string;
  isAnimating: boolean;
}

const MiniBar = ({
  targetSeconds,
  maxSeconds,
  color,
  label,
  isAnimating,
}: MiniBarProps) => {
  const targetWidth = (targetSeconds / maxSeconds) * 100;

  return (
    <div className="relative h-4 flex-1">
      <div
        className="absolute top-0 left-0 h-full bg-neutral-800 rounded-r-sm"
        style={{ width: `${targetWidth}%` }}
      />
      <motion.div
        className="absolute top-0 left-0 h-full rounded-r-sm"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: isAnimating ? `${targetWidth}%` : 0 }}
        transition={{ duration: targetSeconds / 10, ease: "linear" }}
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold ml-2 tabular-nums whitespace-nowrap"
        style={{
          left: `${targetWidth}%`,
          color: color === "#525252" ? "#737373" : color,
        }}
      >
        {label}
      </span>
    </div>
  );
};

MiniBar.displayName = "MiniBar";

interface MiniChartProps {
  isVisible: boolean;
}

const MiniChart = ({ isVisible }: MiniChartProps) => {
  const gridLines = [0, 5, 10, 15, 20];

  return (
    <div className="w-80 py-4 pl-3 pr-5 select-none">
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="w-16 shrink-0" />
          <div className="flex-1 relative h-0">
            {gridLines.map((seconds) => (
              <div
                key={seconds}
                className="absolute top-0 border-l border-neutral-800"
                style={{
                  left: `${(seconds / MAX_SECONDS) * 100}%`,
                  height: "calc(100% + 48px)",
                  marginTop: "-2px",
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 relative">
          <div className="flex items-center gap-2">
            <div className="w-16 text-right text-[10px] font-medium text-neutral-500 shrink-0 leading-tight">
              Claude Code
            </div>
            <MiniBar
              targetSeconds={CONTROL_SECONDS}
              maxSeconds={MAX_SECONDS}
              color="#525252"
              label={`${CONTROL_SECONDS}s`}
              isAnimating={isVisible}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-16 text-right text-[10px] font-medium text-[#ff4fff] shrink-0 leading-tight">
              + React Grab
            </div>
            <div className="relative h-4 flex-1">
              <MiniBar
                targetSeconds={TREATMENT_SECONDS}
                maxSeconds={MAX_SECONDS}
                color="#ff4fff"
                label=""
                isAnimating={isVisible}
              />
              <motion.span
                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 ml-1.5"
                style={{ left: `${(TREATMENT_SECONDS / MAX_SECONDS) * 100}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
              >
                <span className="text-[11px] font-semibold text-[#ff4fff] tabular-nums">
                  {TREATMENT_SECONDS}s
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {DURATION_CHANGE}× faster
                </span>
              </motion.span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="w-16 shrink-0" />
          <div className="flex-1 relative h-4">
            {gridLines.map((seconds) => (
              <span
                key={seconds}
                className="absolute text-[9px] text-neutral-600 -translate-x-1/2"
                style={{ left: `${(seconds / MAX_SECONDS) * 100}%` }}
              >
                {seconds}s
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

MiniChart.displayName = "MiniChart";

export const BenchmarkTooltip = ({
  href,
  children,
  className,
}: BenchmarkTooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      setIsVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(false);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={href} rel="noreferrer" className={className}>
        {children}
      </Link>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 pointer-events-none"
          >
            <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-[#0a0a0a] border-l border-t border-neutral-800 rotate-45" />
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl overflow-hidden">
              <MiniChart isVisible={isVisible} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

BenchmarkTooltip.displayName = "BenchmarkTooltip";
