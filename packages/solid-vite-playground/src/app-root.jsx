import { createSignal } from "solid-js";

export const AppRoot = () => {
  const [counterValue, setCounterValue] = createSignal(0);

  return (
    <main style={{ padding: "24px", "font-family": "Inter, sans-serif" }}>
      <h1>Solid Runtime Playground</h1>
      <p>Use this app to test React Grab source mapping with Solid.</p>
      <button
        type="button"
        onClick={() => setCounterValue((previousValue) => previousValue + 1)}
      >
        Count: {counterValue()}
      </button>
    </main>
  );
};
