"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { HOTKEY_KEYUP_DELAY_MS } from "@/constants";
import { cn } from "@/utils/cn";
import { detectMobile } from "@/utils/detect-mobile";
import { getKeyFromCode } from "@/utils/get-key-from-code";
import { hotkeyToString } from "@/utils/hotkey-to-string";
import { useHotkey } from "./hotkey-context";

export interface RecordedHotkey {
  key: string | null;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface SelectedElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface GrabElementButtonProps {
  onSelect: (element: SelectedElementInfo) => void;
  showSkip?: boolean;
  animationDelay?: number;
}

const EMPTY_MODIFIERS: Readonly<Omit<RecordedHotkey, "key">> = {
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

type ReactGrabModule = typeof import("react-grab");

const withReactGrab = (action: (module: ReactGrabModule) => void): void => {
  if (typeof window === "undefined") return;
  import("react-grab").then(action).catch(console.error);
};

const toggleReactGrab = (): void => {
  withReactGrab((m) => m.getGlobalApi()?.toggle());
};

const deactivateReactGrab = (): void => {
  withReactGrab((m) => m.getGlobalApi()?.deactivate());
};

const updateReactGrabHotkey = (hotkey: RecordedHotkey | null): void => {
  withReactGrab((reactGrab) => {
    reactGrab.getGlobalApi()?.dispose();
    const activationKey = hotkey ? hotkeyToString(hotkey) : undefined;
    const newApi = reactGrab.init({ activationKey });
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
  });
};

interface KbdProps {
  children: ReactNode;
  wide?: boolean;
}

const Kbd = ({ children, wide = false }: KbdProps): ReactElement => (
  <kbd
    className={cn(
      "touch-hitbox inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20",
      wide ? "h-7 px-1.5 text-xs" : "size-7 text-sm",
    )}
  >
    {children}
  </kbd>
);

export const GrabElementButton = ({
  onSelect,
  showSkip = true,
  animationDelay = 0,
}: GrabElementButtonProps): ReactElement | null => {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const { customHotkey, setCustomHotkey } = useHotkey();
  const [isActivated, setIsActivated] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hideSkip, setHideSkip] = useState(false);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const pressedModifiersRef = useRef({ ...EMPTY_MODIFIERS });
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
        pressedModifiersRef.current = { ...EMPTY_MODIFIERS };
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
      pressedModifiersRef.current = { ...EMPTY_MODIFIERS };
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
        pressedModifiersRef.current = { ...EMPTY_MODIFIERS };
        keyUpTimeoutRef.current = null;
      }, HOTKEY_KEYUP_DELAY_MS);
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

  const handleHotkeyClick = (event: ReactMouseEvent): void => {
    if (!hasAdvanced) return;
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
      onSelect({ tagName: "button" });
    } else if (typeof window !== "undefined") {
      import("react-grab").catch(console.error);
    }
  }, [isMobile, onSelect, hasAdvanced]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivated = (): void => setIsActivated(true);
    const handleDeactivated = (): void => setIsActivated(false);

    window.addEventListener("react-grab:activated", handleActivated);
    window.addEventListener("react-grab:deactivated", handleDeactivated);

    return () => {
      window.removeEventListener("react-grab:activated", handleActivated);
      window.removeEventListener("react-grab:deactivated", handleDeactivated);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || hasAdvanced) return;

    const handleElementSelected = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        elements?: Array<SelectedElementInfo>;
      }>;

      const element = customEvent.detail?.elements?.[0] || {
        tagName: "element",
      };

      setIsActivated(false);
      setHasAdvanced(true);
      setHideSkip(true);
      onSelect(element);
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

  const renderHotkeyDisplay = (): ReactElement => {
    if (isRecordingHotkey) {
      return (
        <span className="text-sm text-white/60 animate-pulse px-2 py-1">
          Press keys
        </span>
      );
    }

    if (customHotkey) {
      return (
        <>
          {customHotkey.metaKey && <Kbd>⌘</Kbd>}
          {customHotkey.ctrlKey && <Kbd wide>Ctrl</Kbd>}
          {customHotkey.shiftKey && <Kbd>⇧</Kbd>}
          {customHotkey.altKey && <Kbd>⌥</Kbd>}
          {customHotkey.key && (
            <Kbd>
              <span className="uppercase">{customHotkey.key}</span>
            </Kbd>
          )}
        </>
      );
    }

    if (isMac) {
      return (
        <>
          <Kbd>⌘</Kbd>
          <Kbd>C</Kbd>
        </>
      );
    }

    return (
      <>
        <Kbd wide>Ctrl</Kbd>
        <Kbd>C</Kbd>
      </>
    );
  };

  const renderActivationPrompt = (): ReactElement => (
    <span className="flex items-center gap-1.5 text-white">
      <span>Hold</span>
      <span
        onClick={handleHotkeyClick}
        className={cn(
          "inline-flex items-center gap-1 transition-all outline-none",
          hasAdvanced && "cursor-pointer",
          isRecordingHotkey && "ring-2 ring-white/50 rounded",
        )}
      >
        {renderHotkeyDisplay()}
      </span>
    </span>
  );

  const handleSkip = (): void => {
    setHasAdvanced(true);
    setHideSkip(true);
    setIsActivated(false);
    deactivateReactGrab();
    onSelect({ tagName: "div" });
  };

  if (isMobile) {
    return null;
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: "easeOut", delay: animationDelay }
      }
      className="hidden flex-col gap-2 py-4 sm:flex sm:flex-row sm:items-center sm:gap-3"
    >
      <div className="relative">
        {!hasAdvanced && (
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-lg"
            style={{
              boxShadow:
                "0 0 24px rgba(215,95,203,0.6), 0 0 48px rgba(215,95,203,0.15)",
            }}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    delay: animationDelay + 1.5,
                    duration: 0.85,
                    ease: "easeInOut",
                    times: [0, 0.35, 1],
                  }
            }
          />
        )}
        <button
          onClick={toggleReactGrab}
          className={cn(
            "relative flex h-12 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm text-white transition-all active:scale-[0.98] sm:w-auto sm:text-base",
            hasAdvanced
              ? "border border-white/20 bg-white/5 hover:bg-white/10"
              : "border border-[#d75fcb] bg-[#330039] hover:bg-[#4a0052] shadow-[0_0_12px_rgba(215,95,203,0.4)]",
          )}
          type="button"
        >
          {!isActivated ? (
            renderActivationPrompt()
          ) : (
            <span className="animate-pulse flex items-center gap-1.5">
              Click to select an element
            </span>
          )}
        </button>
        {!hasAdvanced && !isActivated && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.5,
                    ease: "easeOut",
                    delay: animationDelay + 0.6,
                  }
            }
            className="absolute top-1/2 right-full -translate-y-1/2 mr-2 flex items-center gap-1 pointer-events-none select-none"
          >
            <motion.span
              className="font-(family-name:--font-caveat) text-white/40 text-lg -rotate-3"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.4,
                      ease: "easeOut",
                      delay: animationDelay + 1.3,
                    }
              }
            >
              click&nbsp;me!
            </motion.span>
            <svg
              width="32"
              height="16"
              viewBox="0 0 32 16"
              fill="none"
              className="text-white/40 shrink-0"
            >
              <motion.path
                d="M2 10 Q14 12 24 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                initial={shouldReduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.5,
                        ease: "easeOut",
                        delay: animationDelay + 0.8,
                      }
                }
              />
              <motion.path
                d="M21 4 L26 8 L21 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={shouldReduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.3,
                        ease: "easeOut",
                        delay: animationDelay + 1.2,
                      }
                }
              />
            </svg>
          </motion.div>
        )}
      </div>
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
