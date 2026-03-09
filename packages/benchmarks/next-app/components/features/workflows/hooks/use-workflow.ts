"use client";

import { useState, useCallback } from "react";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  steps: Array<{ id: string; type: string; config: Record<string, unknown> }>;
}

export function useWorkflow(workflowId?: string) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleActive = useCallback(() => {
    setWorkflow((prev) =>
      prev ? { ...prev, isActive: !prev.isActive } : null,
    );
  }, []);

  const save = useCallback(async (data: Partial<Workflow>) => {
    setIsSaving(true);
    try {
      setWorkflow((prev) => (prev ? { ...prev, ...data } : null));
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { workflow, isLoading, isSaving, toggleActive, save };
}
