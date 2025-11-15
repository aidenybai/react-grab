"use client";

import { useEffect, useState } from "react";

interface GrabElementButtonProps {
  onSelect: (elementTag: string) => void;
  showSkip?: boolean;
}

export const GrabElementButton = ({ onSelect, showSkip = true }: GrabElementButtonProps) => {
  const [isActivated, setIsActivated] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hideSkip, setHideSkip] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);

  const deactivateSelection = () => {
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);

      const hasTouchPoints = navigator.maxTouchPoints > 0;
      const hasTouchMedia = window.matchMedia("(pointer: coarse)").matches;
      const isMobileDevice = hasTouchPoints || hasTouchMedia;
      setIsMobile(isMobileDevice);

      if (isMobileDevice) {
        setTimeout(() => {
          onSelect("button");
        }, 100);
      } else {
        import("react-grab").catch((error) => {
          console.error("Failed to preload react-grab:", error);
        });
      }
    }
  }, [onSelect]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let hasAdvanced = false;
    let holdStartTime: number | null = null;
    let holdTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (!holdStartTime && !hasAdvanced) {
          holdStartTime = Date.now();
          holdTimeout = setTimeout(() => {
            if (!hasAdvanced && holdStartTime) {
              const timeHeld = Date.now() - holdStartTime;
              if (timeHeld >= 300) {
                setIsActivated(true);
              }
            }
          }, 300);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const isReleasingModifier = !event.metaKey && !event.ctrlKey;
      const isReleasingC = event.key.toLowerCase() === "c";

      if (isReleasingC || isReleasingModifier) {
        holdStartTime = null;
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          holdTimeout = null;
        }
        setIsActivated(false);
      }
    };

    const handleElementSelected = (event: Event) => {
      if (hasAdvanced) return;

      hasAdvanced = true;

      const customEvent = event as CustomEvent<{
        elements?: Array<{ tagName?: string }>;
      }>;

      const tagName =
        customEvent.detail?.elements?.[0]?.tagName || "element";

      setHasAdvanced(true);
      setHideSkip(true);
      setIsActivated(false);
      deactivateSelection();
      onSelect(tagName);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener(
      "react-grab:element-selected",
      handleElementSelected as EventListener,
    );

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener(
        "react-grab:element-selected",
        handleElementSelected as EventListener,
      );
      if (holdTimeout) {
        clearTimeout(holdTimeout);
      }
    };
  }, [onSelect]);

  const handleSkip = () => {
    setHasAdvanced(true);
    setHideSkip(true);
    setIsActivated(false);
    deactivateSelection();
    onSelect("div");
  };

  if (isMobile) {
    return null;
  }

  return (
    <div className="hidden flex-col gap-2 py-4 sm:flex sm:flex-row sm:items-center sm:gap-3">
      <button
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors sm:w-auto ${
          hasAdvanced
            ? "border border-white/20 bg-white/5 hover:bg-white/10"
            : "border border-[#d75fcb] bg-[#330039] hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]"
        }`}
        type="button"
      >
        {!isActivated ? (
          <>
            <kbd className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono">
              {isMac ? "⌘ C" : "Ctrl C"}
            </kbd>
            <span className="text-white">Hold to select element</span>
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
    </div>
  );
};
