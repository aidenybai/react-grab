import { ReactGrabClient } from "./react-grab-client";
import { ServerCard } from "./server-card";
import { SlowFetcher } from "./slow-fetcher";

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1 data-testid="page-title">React Grab E2E (Next)</h1>
      <button data-testid="grab-smoke-target" type="button">
        Smoke target
      </button>
      <ServerCard />
      <SlowFetcher />
      <ReactGrabClient />
    </main>
  );
}
