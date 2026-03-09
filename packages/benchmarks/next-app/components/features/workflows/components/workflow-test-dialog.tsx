"use client";

import { useState } from "react";

interface WorkflowTestDialogProps {
  isOpen: boolean;
  workflowName: string;
  onTest: (payload: string) => void;
  onClose: () => void;
  testResult?: { success: boolean; message: string } | null;
}

export function WorkflowTestDialog({
  isOpen,
  workflowName,
  onTest,
  onClose,
  testResult,
}: WorkflowTestDialogProps) {
  const [payload, setPayload] = useState("{}");

  if (!isOpen) return null;

  return (
    <div className="workflow-test-dialog__overlay" onClick={onClose}>
      <div
        className="workflow-test-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Test Workflow: {workflowName}</h2>
        <label>
          Test Payload (JSON)
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={6}
            className="workflow-test-dialog__textarea"
          />
        </label>
        {testResult && (
          <div
            className={`workflow-test-dialog__result ${testResult.success ? "workflow-test-dialog__result--success" : "workflow-test-dialog__result--error"}`}
          >
            {testResult.message}
          </div>
        )}
        <div className="workflow-test-dialog__actions">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => onTest(payload)}>
            Run Test
          </button>
        </div>
      </div>
    </div>
  );
}
