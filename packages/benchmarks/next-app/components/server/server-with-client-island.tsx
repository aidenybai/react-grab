import { ClientIsland } from "./client-island";

export const ServerWithClientIsland = () => {
  return (
    <div
      data-testid="server-with-client-island"
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--border)",
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
        Server → Client Island
      </h3>
      <p
        style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}
      >
        Server component wrapping a client island.
      </p>
      <ClientIsland />
    </div>
  );
};
