"use client";

import React, { useState, FormEvent } from "react";

interface SettingsSection {
  title: string;
  description?: string;
  fields: {
    name: string;
    label: string;
    type: "text" | "email" | "select" | "toggle";
    value: string | boolean;
    options?: { label: string; value: string }[];
    placeholder?: string;
  }[];
}

interface SettingsFormProps {
  sections: SettingsSection[];
  onSave?: (values: Record<string, string | boolean>) => void;
  isSaving?: boolean;
  className?: string;
}

export function SettingsForm({
  sections,
  onSave,
  isSaving = false,
  className,
}: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        initial[field.name] = field.value;
      });
    });
    return initial;
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave?.(values);
  };

  const updateValue = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 ${className ?? ""}`}>
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="rounded-lg border bg-white p-6">
          <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
          {section.description && (
            <p className="mt-1 text-sm text-gray-500">{section.description}</p>
          )}
          <div className="mt-6 space-y-4">
            {section.fields.map((field) => (
              <div key={field.name} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {field.type === "toggle" ? (
                  <button
                    type="button"
                    onClick={() => updateValue(field.name, !values[field.name])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      values[field.name] ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        values[field.name] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                ) : field.type === "select" ? (
                  <select
                    value={values[field.name] as string}
                    onChange={(e) => updateValue(field.name, e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.name] as string}
                    onChange={(e) => updateValue(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default SettingsForm;
