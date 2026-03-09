interface ServerStatCardProps {
  label: string;
  value: string;
  "data-testid"?: string;
}

export const ServerStatCard = ({
  label,
  value,
  "data-testid": testId,
}: ServerStatCardProps) => {
  return (
    <div
      data-testid={testId}
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>
        {value}
      </p>
    </div>
  );
};
