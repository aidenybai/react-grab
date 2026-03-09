import { ServerFeatureItem } from "./server-feature-item";

const FEATURES = [
  {
    title: "Server-side rendering",
    description: "Components render on the server with zero client JS.",
  },
  {
    title: "Nested composition",
    description: "Server components compose other server components.",
  },
  {
    title: "Data fetching",
    description: "Async data fetching without useEffect or client state.",
  },
];

export const ServerFeatureList = () => {
  return (
    <ul
      data-testid="server-feature-list"
      style={{
        listStyle: "none",
        padding: 0,
        margin: "16px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {FEATURES.map((feature, index) => (
        <ServerFeatureItem
          key={feature.title}
          title={feature.title}
          description={feature.description}
          data-testid={index === 0 ? "server-feature-item" : undefined}
        />
      ))}
    </ul>
  );
};
