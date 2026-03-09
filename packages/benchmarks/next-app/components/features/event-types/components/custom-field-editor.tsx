"use client";

import { useState, useCallback } from "react";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "phone" | "email";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface CustomFieldEditorProps {
  fields: CustomField[];
  onChange?: (fields: CustomField[]) => void;
}

export function CustomFieldEditor({
  fields,
  onChange,
}: CustomFieldEditorProps) {
  const addField = useCallback(() => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      label: "",
      type: "text",
      required: false,
    };
    onChange?.([...fields, newField]);
  }, [fields, onChange]);

  const removeField = useCallback(
    (id: string) => {
      onChange?.(fields.filter((f) => f.id !== id));
    },
    [fields, onChange],
  );

  const updateField = useCallback(
    (id: string, updates: Partial<CustomField>) => {
      onChange?.(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    },
    [fields, onChange],
  );

  return (
    <div className="custom-field-editor">
      <h4>Custom Fields</h4>
      {fields.map((field) => (
        <div key={field.id} className="custom-field-editor__row">
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
            placeholder="Field label"
          />
          <select
            value={field.type}
            onChange={(e) =>
              updateField(field.id, {
                type: e.target.value as CustomField["type"],
              })
            }
          >
            <option value="text">Text</option>
            <option value="textarea">Text Area</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) =>
                updateField(field.id, { required: e.target.checked })
              }
            />
            Required
          </label>
          <button className="btn btn-sm" onClick={() => removeField(field.id)}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn btn-sm btn-outline" onClick={addField}>
        Add Field
      </button>
    </div>
  );
}
