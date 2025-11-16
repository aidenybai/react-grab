"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { detectMobile } from "@/utils/detect-mobile";
import { cn } from "@/utils/classnames";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

interface GrabElementButtonProps {
  onSelect: (elementTag: string) => void;
  showSkip?: boolean;
  animationDelay?: number;
}

const deactivateReactGrab = () => {
  if (typeof window === "undefined") return;
  import("react-grab")
    .then((reactGrab) => {
      const api = reactGrab.getGlobalApi();
      if (api) {
        api.deactivate();
      }
    })
    .catch((error) => {
      console.error("Failed to deactivate react-grab:", error);
    });
};

export const GrabElementButton = ({
  onSelect,
  showSkip = true,
  animationDelay = 0
}: GrabElementButtonProps) => {
  const [isActivated, setIsActivated] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hideSkip, setHideSkip] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
      setIsMobile(detectMobile());
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      onSelect("button");
    } else if (typeof window !== "undefined") {
      import("react-grab").catch((error) => {
        console.error("Failed to preload react-grab:", error);
      });
    }
  }, [isMobile, onSelect]);

  useKeyboardShortcut({
    onActivate: useCallback(() => setIsActivated(true), []),
    onDeactivate: useCallback(() => setIsActivated(false), []),
    enabled: !hasAdvanced,
  });

  useEffect(() => {
    if (typeof window === "undefined" || hasAdvanced) return;

    const handleElementSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{
        elements?: Array<{ tagName?: string }>;
      }>;

      const tagName = customEvent.detail?.elements?.[0]?.tagName || "element";

      setIsActivated(false);
      setHasAdvanced(true);
      setHideSkip(true);
      onSelect(tagName);
    };

    window.addEventListener("react-grab:element-selected", handleElementSelected as EventListener);

    return () => {
      window.removeEventListener("react-grab:element-selected", handleElementSelected as EventListener);
    };
  }, [onSelect, hasAdvanced]);

  const handleSkip = () => {
    setHasAdvanced(true);
    setHideSkip(true);
    setIsActivated(false);
    deactivateReactGrab();
    onSelect("div");
  };

  if (isMobile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: animationDelay }}
      className="hidden flex-col gap-2 py-4 sm:flex sm:flex-row sm:items-center sm:gap-3"
    >
      <button
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm text-white transition-colors sm:w-auto",
          hasAdvanced
            ? "border border-white/20 bg-white/5 hover:bg-white/10"
            : "border border-[#d75fcb] bg-[#330039] hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]"
        )}
        type="button"
      >
        {!isActivated ? (
          <>
            <span className="flex items-center gap-1.5 text-white">
              <span>Hold</span>
              <kbd className="inline-flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 font-mono text-base font-semibold">
                {isMac ? (
                  <>
                    <span className="text-lg leading-none">⌘</span>
                    <span className="text-sm leading-none">C</span>
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none">Ctrl</span>
                    <span className="text-sm leading-none">C</span>
                  </>
                )}
              </kbd>
              <span>to select element</span>
            </span>
          </>
        ) : (
          <span className="animate-pulse">Move your mouse and click/drag to select an element</span>
        )}
      </button>
      {!hideSkip && showSkip && (
        <button
          onClick={handleSkip}
          className="px-3 py-2 text-white/50 hover:text-white/90 text-sm transition-colors"
          type="button"
        >
          Skip
        </button>
      )}
    </motion.div>
  );
};
