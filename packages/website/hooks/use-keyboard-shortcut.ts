"use client";

import { useEffect, useRef } from "react";

interface UseKeyboardShortcutOptions {
  onActivate: () => void;
  onDeactivate: () => void;
  holdDuration?: number;
  enabled?: boolean;
}

export const useKeyboardShortcut = ({
  onActivate,
  onDeactivate,
  holdDuration = 300,
  enabled = true,
}: UseKeyboardShortcutOptions) => {
  const holdStartTimeRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = Date.now();
          holdTimeoutRef.current = setTimeout(() => {
            if (holdStartTimeRef.current) {
              const timeHeld = Date.now() - holdStartTimeRef.current;
              if (timeHeld >= holdDuration) {
                onActivate();
              }
            }
          }, holdDuration);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const isReleasingModifier = !event.metaKey && !event.ctrlKey;
      const isReleasingC = event.key.toLowerCase() === "c";

      if (isReleasingC || isReleasingModifier) {
        holdStartTimeRef.current = null;
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        onDeactivate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
    };
  }, [onActivate, onDeactivate, holdDuration, enabled]);
};



