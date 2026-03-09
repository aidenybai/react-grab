"use client";

import { useState, useCallback } from "react";

interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export function useWorkflowSteps(initialSteps: WorkflowStep[] = []) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);

  const addStep = useCallback((type: string) => {
    setSteps((prev) => [
      ...prev,
      { id: `step-${Date.now()}`, type, config: {}, order: prev.length },
    ]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
    );
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setSteps((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const updateStepConfig = useCallback(
    (stepId: string, config: Record<string, unknown>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, config } : s)),
      );
    },
    [],
  );

  return { steps, addStep, removeStep, reorderSteps, updateStepConfig };
}
