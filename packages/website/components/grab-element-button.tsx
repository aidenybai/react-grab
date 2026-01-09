"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { detectMobile } from "@/utils/detect-mobile";
import { cn } from "@/utils/classnames";
import { useHotkey } from "./hotkey-context";
import { getKeyFromCode } from "@/utils/get-key-from-code";
import { hotkeyToString } from "@/utils/hotkey-to-string";

export interface RecordedHotkey {
  key: string | null;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

interface GrabElementButtonProps {
  onSelect: (elementTag: string) => void;
  showSkip?: boolean;
  animationDelay?: number;
}

const toggleReactGrab = () => {
  if (typeof window === "undefined") return;
  import("react-grab")
    .then((reactGrab) => {
      const api = reactGrab.getGlobalApi();
      if (api) {
        api.toggle();
      }
    })
    .catch((error) => {
      console.error("Failed to toggle react-grab:", error);
    });
};

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

const updateReactGrabHotkey = (hotkey: RecordedHotkey | null) => {
  if (typeof window === "undefined") return;
  import("react-grab")
    .then((reactGrab) => {
      const api = reactGrab.getGlobalApi();
      if (api) {
        api.dispose();
      }
      const activationKey = hotkey ? hotkeyToString(hotkey) : undefined;
      const newApi = reactGrab.init({
        activationKey,
      });
      newApi.registerPlugin({
        name: "website-events",
        hooks: {
          onActivate: () => {
            window.dispatchEvent(new CustomEvent("react-grab:activated"));
          },
          onDeactivate: () => {
            window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
          },
        },
      });
      reactGrab.setGlobalApi(newApi);
    })
    .catch((error) => {
      console.error("Failed to update react-grab hotkey:", error);
    });
};

export const GrabElementButton = ({
  onSelect,
  showSkip = true,
  animationDelay = 0,
}: GrabElementButtonProps) => {
  const { customHotkey, setCustomHotkey } = useHotkey();
  const [isActivated, setIsActivated] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hideSkip, setHideSkip] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const pressedModifiersRef = useRef({
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  });
  const keyUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHotkeyChange = useCallback(
    (hotkey: RecordedHotkey) => {
      setCustomHotkey(hotkey);
      updateReactGrabHotkey(hotkey);
    },
    [setCustomHotkey],
  );

  const handleHotkeyKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (keyUpTimeoutRef.current) {
        clearTimeout(keyUpTimeoutRef.current);
        keyUpTimeoutRef.current = null;
      }

      if (event.key === "Escape") {
        setIsRecordingHotkey(false);
        pressedModifiersRef.current = {
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        };
        return;
      }

      pressedModifiersRef.current = {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      };

      if (["Meta", "Control", "Shift", "Alt"].includes(event.key)) return;

      const keyFromCode = getKeyFromCode(event.code);
      if (!keyFromCode) return;

      const hasModifier =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!hasModifier) return;

      handleHotkeyChange({
        key: keyFromCode,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
      setIsRecordingHotkey(false);
      pressedModifiersRef.current = {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      };
    },
    [handleHotkeyChange],
  );

  const handleHotkeyKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const modifierMap: Record<string, keyof RecordedHotkey> = {
        Meta: "metaKey",
        Control: "ctrlKey",
        Shift: "shiftKey",
        Alt: "altKey",
      };
      const releasedModifier = modifierMap[event.key];
      if (!releasedModifier) return;

      event.preventDefault();
      event.stopPropagation();

      const pressedModifiers = pressedModifiersRef.current;
      const modifiersAtRelease = {
        metaKey: pressedModifiers.metaKey || event.key === "Meta",
        ctrlKey: pressedModifiers.ctrlKey || event.key === "Control",
        shiftKey: pressedModifiers.shiftKey || event.key === "Shift",
        altKey: pressedModifiers.altKey || event.key === "Alt",
      };

      const hasAnyModifier =
        modifiersAtRelease.metaKey ||
        modifiersAtRelease.ctrlKey ||
        modifiersAtRelease.shiftKey ||
        modifiersAtRelease.altKey;
      if (!hasAnyModifier) return;

      if (keyUpTimeoutRef.current) {
        clearTimeout(keyUpTimeoutRef.current);
      }

      keyUpTimeoutRef.current = setTimeout(() => {
        handleHotkeyChange({
          key: null,
          ...modifiersAtRelease,
        });
        setIsRecordingHotkey(false);
        pressedModifiersRef.current = {
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        };
        keyUpTimeoutRef.current = null;
      }, 150);
    },
    [handleHotkeyChange],
  );

  useEffect(() => {
    if (isRecordingHotkey) {
      window.addEventListener("keydown", handleHotkeyKeyDown, true);
      window.addEventListener("keyup", handleHotkeyKeyUp, true);
      return () => {
        window.removeEventListener("keydown", handleHotkeyKeyDown, true);
        window.removeEventListener("keyup", handleHotkeyKeyUp, true);
      };
    }
  }, [isRecordingHotkey, handleHotkeyKeyDown, handleHotkeyKeyUp]);

  const handleHotkeyClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRecordingHotkey(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
      setIsMobile(detectMobile());
    }
  }, []);

  useEffect(() => {
    if (isMobile && !hasAdvanced) {
      setHasAdvanced(true);
      onSelect("button");
    } else if (typeof window !== "undefined") {
      import("react-grab").catch((error) => {
        console.error("Failed to preload react-grab:", error);
      });
    }
  }, [isMobile, onSelect, hasAdvanced]);

  useEffect(() => {
    if (hasAdvanced || typeof window === "undefined") return;

    const handleActivated = () => setIsActivated(true);
    const handleDeactivated = () => setIsActivated(false);

    window.addEventListener("react-grab:activated", handleActivated);
    window.addEventListener("react-grab:deactivated", handleDeactivated);

    return () => {
      window.removeEventListener("react-grab:activated", handleActivated);
      window.removeEventListener("react-grab:deactivated", handleDeactivated);
    };
  }, [hasAdvanced]);

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

    window.addEventListener(
      "react-grab:element-selected",
      handleElementSelected as EventListener,
    );

    return () => {
      window.removeEventListener(
        "react-grab:element-selected",
        handleElementSelected as EventListener,
      );
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
        onClick={toggleReactGrab}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm text-white transition-colors sm:w-auto sm:text-base",
          hasAdvanced
            ? "border border-white/20 bg-white/5 hover:bg-white/10"
            : "border border-[#d75fcb] bg-[#330039] hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]",
        )}
        type="button"
      >
        {!isActivated ? (
          <>
            <span className="flex items-center gap-1.5 text-white">
              <span>Hold</span>
              <span
                onClick={handleHotkeyClick}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 transition-all outline-none",
                  isRecordingHotkey && "ring-2 ring-white/50 rounded",
                )}
              >
                {isRecordingHotkey ? (
                  <span className="text-sm text-white/60 animate-pulse px-2 py-1">
                    Press keys
                  </span>
                ) : customHotkey ? (
                  <>
                    {customHotkey.metaKey && (
                      <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                        ⌘
                      </kbd>
                    )}
                    {customHotkey.ctrlKey && (
                      <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-xs">
                        Ctrl
                      </kbd>
                    )}
                    {customHotkey.shiftKey && (
                      <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                        ⇧
                      </kbd>
                    )}
                    {customHotkey.altKey && (
                      <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                        ⌥
                      </kbd>
                    )}
                    {customHotkey.key && (
                      <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm uppercase">
                        {customHotkey.key}
                      </kbd>
                    )}
                  </>
                ) : isMac ? (
                  <>
                    <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                      ⌘
                    </kbd>
                    <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                      C
                    </kbd>
                  </>
                ) : (
                  <>
                    <kbd className="inline-flex items-center justify-center h-7 px-1.5 rounded bg-white/10 hover:bg-white/20 text-xs">
                      Ctrl
                    </kbd>
                    <kbd className="inline-flex items-center justify-center size-7 rounded bg-white/10 hover:bg-white/20 text-sm">
                      C
                    </kbd>
                  </>
                )}
              </span>
            </span>
          </>
        ) : (
          <span className="animate-pulse flex items-center gap-1.5">
            Click anywhere to select or press
            <kbd className="inline-flex items-center justify-center h-7 px-1.5 rounded bg-white/10 text-xs">
              Esc
            </kbd>
            to cancel
          </span>
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

GrabElementButton.displayName = "GrabElementButton";
