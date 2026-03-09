import { ClientBenchmarks } from "./client-benchmarks";
import { ServerHero } from "@/components/server/server-hero";
import { ServerWithClientIsland } from "@/components/server/server-with-client-island";

const ServerPage = () => {
  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <ServerHero />
          <ServerWithClientIsland />
        </div>
      </div>
      <ClientBenchmarks />
    </>
  );
};

export default ServerPage;
