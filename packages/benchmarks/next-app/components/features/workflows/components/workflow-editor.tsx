"use client";

import { useState, useCallback } from "react";

interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowEditorProps {
  initialSteps?: WorkflowStep[];
  onSave?: (steps: WorkflowStep[]) => void;
  isReadOnly?: boolean;
}

export function WorkflowEditor({
  initialSteps = [],
  onSave,
  isReadOnly = false,
}: WorkflowEditorProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const addStep = useCallback(() => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: "action",
      config: {},
    };
    setSteps((prev) => [...prev, newStep]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(steps);
  }, [steps, onSave]);

  return (
    <div className="workflow-editor">
      <div className="workflow-editor__toolbar">
        {!isReadOnly && (
          <>
            <button className="btn btn-sm" onClick={addStep}>
              Add Step
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Save
            </button>
          </>
        )}
      </div>
      <div className="workflow-editor__canvas">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`workflow-editor__step ${selectedStepId === step.id ? "workflow-editor__step--selected" : ""}`}
            onClick={() => setSelectedStepId(step.id)}
          >
            <span className="workflow-editor__step-number">{index + 1}</span>
            <span className="workflow-editor__step-type">{step.type}</span>
            {!isReadOnly && (
              <button
                onClick={() => removeStep(step.id)}
                className="workflow-editor__step-remove"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
