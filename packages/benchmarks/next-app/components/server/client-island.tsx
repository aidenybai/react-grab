"use client";

import { useState } from "react";

export const ClientIsland = () => {
  const [count, setCount] = useState(0);

  return (
    <div
      data-testid="client-island-in-server"
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 6,
        background: "var(--muted)",
      }}
    >
      <button
        data-testid="client-island-button"
        onClick={() => setCount((previous) => previous + 1)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--background)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Clicked {count} times
      </button>
    </div>
  );
};
