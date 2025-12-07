"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { RecordedHotkey } from "./grab-element-button";

interface HotkeyContextValue {
  customHotkey: RecordedHotkey | null;
  setCustomHotkey: (hotkey: RecordedHotkey | null) => void;
}

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

interface HotkeyProviderProps {
  children: ReactNode;
}

export const HotkeyProvider = ({ children }: HotkeyProviderProps) => {
  const [customHotkey, setCustomHotkeyState] = useState<RecordedHotkey | null>(
    null,
  );

  const setCustomHotkey = useCallback((hotkey: RecordedHotkey | null) => {
    setCustomHotkeyState(hotkey);
  }, []);

  return (
    <HotkeyContext.Provider value={{ customHotkey, setCustomHotkey }}>
      {children}
    </HotkeyContext.Provider>
  );
};

HotkeyProvider.displayName = "HotkeyProvider";

export const useHotkey = (): HotkeyContextValue => {
  const context = useContext(HotkeyContext);
  if (!context) {
    return { customHotkey: null, setCustomHotkey: () => {} };
  }
  return context;
};
