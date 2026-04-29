/** @jsxImportSource react */
import { useEffect, useState } from "react";

const TICK_INTERVAL_MS = 100;
const PULSE_ELEMENT_COUNT = 24;

interface PulseElement {
  id: number;
  hue: number;
}

const MetricCard = (props: { label: string; value: string; valueColor?: string }) => (
  <div
    data-component="MetricCard"
    style={{
      padding: "20px",
      background: "#1a1a1a",
      borderRadius: "12px",
      border: "1px solid #2a2a2a",
    }}
  >
    <div style={{ fontSize: "12px", color: "#888", fontWeight: 500 }}>{props.label}</div>
    <div
      style={{
        fontSize: "36px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        marginTop: "4px",
        color: props.valueColor,
      }}
    >
      {props.value}
    </div>
  </div>
);

export const LiveCounter = () => {
  const [count, setCount] = useState(0);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [pulses, setPulses] = useState<ReadonlyArray<PulseElement>>(() =>
    Array.from({ length: PULSE_ELEMENT_COUNT }, (_, index) => ({
      id: index,
      hue: (index / PULSE_ELEMENT_COUNT) * 360,
    })),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCount((previous) => previous + 1);
      setTimestamp(Date.now());
      setPulses((previousPulses) =>
        previousPulses.map((pulse) => ({
          id: pulse.id,
          hue: (pulse.hue + 5) % 360,
        })),
      );
    }, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  const elapsedSeconds = ((count * TICK_INTERVAL_MS) / 1000).toFixed(1);

  return (
    <div
      data-component="LiveUpdatesRoot"
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      <header>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700 }}>Live Updates</h1>
        <p style={{ margin: 0, color: "#888", fontSize: "14px", maxWidth: "600px" }}>
          Each element below re-renders every {TICK_INTERVAL_MS}ms via React useState + setInterval.
          Activate react-grab (Alt) to verify the freeze-updates system stops these React renders
          while you're selecting.
        </p>
      </header>

      <section
        data-component="CounterGrid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}
      >
        <MetricCard label="Tick count" value={String(count)} />
        <MetricCard label="Elapsed (s)" value={elapsedSeconds} />
        <MetricCard label="Timestamp" value={String(timestamp)} valueColor="#4ade80" />
      </section>

      <section data-component="PulseGrid">
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
          Color-shifting grid
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
          {pulses.map((pulse) => (
            <div
              key={pulse.id}
              data-component="PulseCell"
              data-pulse-id={pulse.id}
              style={{
                height: "64px",
                borderRadius: "8px",
                background: `hsl(${pulse.hue}, 80%, 55%)`,
                transition: "background 120ms linear",
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
