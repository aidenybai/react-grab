"use client";

import { useState } from "react";

interface WorkflowActionConfigProps {
  actionType: string;
  config: Record<string, string>;
  onChange?: (config: Record<string, string>) => void;
}

export function WorkflowActionConfig({
  actionType,
  config,
  onChange,
}: WorkflowActionConfigProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    onChange?.(updated);
  };

  const renderFields = () => {
    switch (actionType) {
      case "email":
        return (
          <>
            <label>
              Subject
              <input
                type="text"
                value={localConfig.subject ?? ""}
                onChange={(e) => handleFieldChange("subject", e.target.value)}
              />
            </label>
            <label>
              Body
              <textarea
                value={localConfig.body ?? ""}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                rows={4}
              />
            </label>
          </>
        );
      case "sms":
        return (
          <label>
            Message
            <textarea
              value={localConfig.message ?? ""}
              onChange={(e) => handleFieldChange("message", e.target.value)}
              rows={3}
            />
          </label>
        );
      default:
        return <p>No configuration available for this action type.</p>;
    }
  };

  return (
    <div className="workflow-action-config">
      <h4 className="workflow-action-config__title">Configure: {actionType}</h4>
      <div className="workflow-action-config__fields">{renderFields()}</div>
    </div>
  );
}
