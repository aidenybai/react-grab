export function validateWorkflowName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name.trim()) return { valid: false, error: "Name is required" };
  if (name.length > 100)
    return { valid: false, error: "Name must be 100 characters or less" };
  return { valid: true };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    success: "#10b981",
    failure: "#ef4444",
    running: "#3b82f6",
    skipped: "#9ca3af",
    pending: "#f59e0b",
  };
  return colors[status] ?? "#6b7280";
}

export function generateWorkflowId(): string {
  return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
