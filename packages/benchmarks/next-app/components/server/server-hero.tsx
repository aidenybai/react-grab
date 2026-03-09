import { ServerStats } from "./server-stats";
import { ServerFeatureList } from "./server-feature-list";

export const ServerHero = () => {
  return (
    <section
      data-testid="server-hero"
      style={{
        padding: 24,
        borderRadius: 12,
        border: "1px solid var(--border)",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
        Server Component Hero
      </h2>
      <p
        style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}
      >
        Rendered entirely on the server with nested server children.
      </p>
      <ServerStats />
      <ServerFeatureList />
    </section>
  );
};
