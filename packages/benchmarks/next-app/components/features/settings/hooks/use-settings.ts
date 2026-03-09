"use client";
import { useState, useCallback } from "react";

interface Settings {
  displayName: string;
  email: string;
  timezone: string;
  language: string;
  notifications: boolean;
  darkMode: boolean;
}

const defaultSettings: Settings = {
  displayName: "",
  email: "",
  timezone: "UTC",
  language: "en",
  notifications: true,
  darkMode: false,
};

export const useSettings = (initial?: Partial<Settings>) => {
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    ...initial,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...defaultSettings, ...initial });
    setIsDirty(false);
  }, [initial]);

  return { settings, updateSetting, save, reset, isDirty, saving };
};
