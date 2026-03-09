"use client";

interface WorkflowRun {
  id: string;
  status: "success" | "failure" | "running" | "skipped";
  startedAt: string;
  duration: number;
  triggeredBy: string;
  error?: string;
}

interface WorkflowHistoryProps {
  runs: WorkflowRun[];
  isLoading?: boolean;
  onViewDetails?: (runId: string) => void;
}

const statusColors: Record<string, string> = {
  success: "#10b981",
  failure: "#ef4444",
  running: "#3b82f6",
  skipped: "#9ca3af",
};

export function WorkflowHistory({
  runs,
  isLoading,
  onViewDetails,
}: WorkflowHistoryProps) {
  if (isLoading)
    return <div className="workflow-history--loading">Loading history...</div>;

  return (
    <div className="workflow-history">
      <h3 className="workflow-history__title">Run History</h3>
      <table className="workflow-history__table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Triggered By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <span style={{ color: statusColors[run.status] }}>
                  {run.status}
                </span>
              </td>
              <td>{run.startedAt}</td>
              <td>{run.duration}ms</td>
              <td>{run.triggeredBy}</td>
              <td>
                <button
                  className="btn btn-sm"
                  onClick={() => onViewDetails?.(run.id)}
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
