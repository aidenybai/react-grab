"use client";

import { useState, useEffect, useLayoutEffect } from "react";

const blockMainThread = (ms: number) => {
  const start = performance.now();
  while (performance.now() - start < ms) {
    /* intentionally blocking */
  }
};

const SlowRenderChild = ({ delay }: { delay: number }) => {
  blockMainThread(delay);
  return (
    <div
      style={{
        padding: 8,
        background: "#fee2e2",
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      Rendered in {delay}ms (blocking)
    </div>
  );
};

const SlowEffectComponent = ({ delay }: { delay: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    blockMainThread(delay);
  }, [count, delay]);

  return (
    <div
      style={{
        padding: 8,
        background: "#ffedd5",
        borderRadius: 4,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>useEffect blocks for {delay}ms</span>
      <button
        style={{
          padding: "2px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          background: "white",
          cursor: "pointer",
          fontSize: 12,
        }}
        onClick={() => setCount((previous) => previous + 1)}
      >
        Trigger ({count})
      </button>
    </div>
  );
};

const SlowLayoutEffectComponent = ({ delay }: { delay: number }) => {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    blockMainThread(delay);
  }, [count, delay]);

  return (
    <div
      style={{
        padding: 8,
        background: "#fef9c3",
        borderRadius: 4,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>useLayoutEffect blocks for {delay}ms</span>
      <button
        style={{
          padding: "2px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          background: "white",
          cursor: "pointer",
          fontSize: 12,
        }}
        onClick={() => setCount((previous) => previous + 1)}
      >
        Trigger ({count})
      </button>
    </div>
  );
};

const CascadeRenderComponent = () => {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        padding: 8,
        background: "#f3e8ff",
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span>Cascade render (5 children x 10ms)</span>
        <button
          style={{
            padding: "2px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: "white",
            cursor: "pointer",
            fontSize: 12,
          }}
          onClick={() => setCount((previous) => previous + 1)}
        >
          Trigger ({count})
        </button>
      </div>
      <div
        style={{
          paddingLeft: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {[...Array(5)].map((_, index) => (
          <SlowRenderChild key={`${count}-${index}`} delay={10} />
        ))}
      </div>
    </div>
  );
};

const RapidUpdatesComponent = () => {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    let frame = 0;
    const maxFrames = 60;

    const tick = () => {
      if (frame < maxFrames) {
        setCount((previous) => previous + 1);
        blockMainThread(5);
        frame++;
        requestAnimationFrame(tick);
      } else {
        setIsRunning(false);
      }
    };

    requestAnimationFrame(tick);
  }, [isRunning]);

  return (
    <div
      style={{
        padding: 8,
        background: "#dcfce7",
        borderRadius: 4,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>Rapid updates (60 frames x 5ms)</span>
      <button
        style={{
          padding: "2px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          background: "white",
          cursor: "pointer",
          fontSize: 12,
          opacity: isRunning ? 0.5 : 1,
        }}
        onClick={() => setIsRunning(true)}
        disabled={isRunning}
      >
        {isRunning ? `Running... (${count})` : `Start (${count})`}
      </button>
    </div>
  );
};

export default function ToolbarEntriesPage() {
  const [showSlowRender, setShowSlowRender] = useState(false);

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Performance Test Zone
      </h1>
      <p
        style={{
          color: "#666",
          marginBottom: 24,
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        Intentionally laggy components to exercise the toolbar devtools. Use the{" "}
        <strong>Render Monitor</strong> (pulse icon) and{" "}
        <strong>FPS Monitor</strong> (monitor icon) in the toolbar.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <button
            style={{
              padding: "4px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
              background: showSlowRender ? "#fee2e2" : "white",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={() => setShowSlowRender(!showSlowRender)}
          >
            {showSlowRender ? "Hide" : "Show"} Slow Render (50ms)
          </button>
        </div>

        {showSlowRender && <SlowRenderChild delay={50} />}
        <SlowEffectComponent delay={30} />
        <SlowLayoutEffectComponent delay={20} />
        <CascadeRenderComponent />
        <RapidUpdatesComponent />
      </div>
    </div>
  );
}
