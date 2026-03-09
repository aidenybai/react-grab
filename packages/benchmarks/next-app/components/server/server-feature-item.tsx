interface ServerFeatureItemProps {
  title: string;
  description: string;
  "data-testid"?: string;
}

export const ServerFeatureItem = ({
  title,
  description,
  "data-testid": testId,
}: ServerFeatureItemProps) => {
  return (
    <li
      data-testid={testId}
      style={{
        padding: 12,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
      <p
        style={{
          fontSize: 12,
          color: "var(--muted-foreground)",
          margin: "4px 0 0",
        }}
      >
        {description}
      </p>
    </li>
  );
};
