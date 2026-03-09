"use client";

import { useState, useCallback } from "react";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface WorkflowConditionBuilderProps {
  conditions?: Condition[];
  onChange?: (conditions: Condition[]) => void;
  fields?: string[];
}

const OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
  "gt",
  "lt",
];

export function WorkflowConditionBuilder({
  conditions = [],
  onChange,
  fields = ["email", "name", "status", "source"],
}: WorkflowConditionBuilderProps) {
  const [localConditions, setLocalConditions] =
    useState<Condition[]>(conditions);

  const addCondition = useCallback(() => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      field: fields[0],
      operator: "equals",
      value: "",
    };
    const updated = [...localConditions, newCondition];
    setLocalConditions(updated);
    onChange?.(updated);
  }, [localConditions, onChange, fields]);

  const removeCondition = useCallback(
    (id: string) => {
      const updated = localConditions.filter((c) => c.id !== id);
      setLocalConditions(updated);
      onChange?.(updated);
    },
    [localConditions, onChange],
  );

  return (
    <div className="workflow-condition-builder">
      <h4>Conditions</h4>
      {localConditions.map((cond) => (
        <div key={cond.id} className="workflow-condition-builder__row">
          <select value={cond.field} onChange={() => {}}>
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select value={cond.operator} onChange={() => {}}>
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={cond.value}
            onChange={() => {}}
            placeholder="Value"
          />
          <button onClick={() => removeCondition(cond.id)}>Remove</button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={addCondition}>
        Add Condition
      </button>
    </div>
  );
}
