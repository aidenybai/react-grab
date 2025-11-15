"use client";

import { useEffect, useState } from "react";

interface GrabElementButtonProps {
  onSelect: (elementTag: string) => void;
  showSkip?: boolean;
}

export const GrabElementButton = ({ onSelect, showSkip = true }: GrabElementButtonProps) => {
  const [isActivated, setIsActivated] = useState(false);
  const [isMac, setIsMac] = useState(true);
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

      // Preload react-grab so it's ready when user activates
      import("react-grab").catch((error) => {
        console.error("Failed to preload react-grab:", error);
      });
    }
  }, []);

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

  return (
    <div className="flex items-center gap-3 py-4">
      <button
        className={`px-3 py-2 rounded-lg text-white text-sm transition-colors flex items-center gap-2 cursor-pointer ${
          hasAdvanced
            ? "border border-white/20 bg-white/5 hover:bg-white/10"
            : "border border-[#d75fcb] bg-[#330039] hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]"
        }`}
        type="button"
      >
        {!isActivated ? (
          <>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono">
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
