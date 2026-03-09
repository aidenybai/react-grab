"use client";

import React, { useState } from "react";

interface SettingField {
  key: string;
  label: string;
  value: string;
  type: "text" | "email" | "select";
  options?: string[];
}

const generalSettings: SettingField[] = [
  { key: "name", label: "Display Name", value: "Acme Inc.", type: "text" },
  {
    key: "email",
    label: "Email Address",
    value: "admin@acme.dev",
    type: "email",
  },
  {
    key: "language",
    label: "Language",
    value: "en",
    type: "select",
    options: ["en", "es", "fr", "de", "ja"],
  },
  {
    key: "timezone",
    label: "Timezone",
    value: "America/New_York",
    type: "select",
    options: [
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Tokyo",
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(generalSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s)),
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences and configuration.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">General</h2>
        <p className="mt-1 text-sm text-gray-500">
          Basic account information and preferences.
        </p>
        <div className="mt-6 space-y-4">
          {settings.map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-3 items-center gap-4"
            >
              <label className="text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <div className="col-span-2">
                {field.type === "select" ? (
                  <select
                    value={field.value}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {saved && (
          <p className="text-sm text-green-600">Settings saved successfully.</p>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
