"use client";

import { useState, useCallback } from "react";

interface ApiKeyInputProps {
  label?: string;
  value?: string;
  onSave: (key: string) => void;
  onRevoke?: () => void;
  isRevealed?: boolean;
}

export function ApiKeyInput({
  label = "API Key",
  value = "",
  onSave,
  onRevoke,
  isRevealed = false,
}: ApiKeyInputProps) {
  const [key, setKey] = useState(value);
  const [revealed, setRevealed] = useState(isRevealed);

  const maskedValue = key ? key.slice(0, 8) + "••••••••" + key.slice(-4) : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(key);
  }, [key]);

  return (
    <div className="api-key-input">
      <label className="api-key-input__label">{label}</label>
      <div className="api-key-input__row">
        <input
          type={revealed ? "text" : "password"}
          value={revealed ? key : maskedValue}
          onChange={(e) => setKey(e.target.value)}
          className="api-key-input__field"
          readOnly={!!value}
        />
        <button className="btn btn-sm" onClick={() => setRevealed(!revealed)}>
          {revealed ? "Hide" : "Show"}
        </button>
        <button className="btn btn-sm" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <div className="api-key-input__actions">
        {!value && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onSave(key)}
          >
            Save
          </button>
        )}
        {value && onRevoke && (
          <button className="btn btn-danger btn-sm" onClick={onRevoke}>
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
