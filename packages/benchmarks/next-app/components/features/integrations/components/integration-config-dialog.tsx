"use client";

import { useState } from "react";

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  options?: string[];
  required?: boolean;
}

interface IntegrationConfigDialogProps {
  isOpen: boolean;
  integrationName: string;
  fields: ConfigField[];
  initialValues?: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
}

export function IntegrationConfigDialog({
  isOpen,
  integrationName,
  fields,
  initialValues = {},
  onSave,
  onClose,
}: IntegrationConfigDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  if (!isOpen) return null;

  return (
    <div className="integration-config-dialog__overlay" onClick={onClose}>
      <div
        className="integration-config-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Configure {integrationName}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(values);
          }}
        >
          {fields.map((field) => (
            <div key={field.key} className="integration-config-dialog__field">
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === "select" ? (
                <select
                  id={field.key}
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  type={field.type}
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="integration-config-dialog__actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
