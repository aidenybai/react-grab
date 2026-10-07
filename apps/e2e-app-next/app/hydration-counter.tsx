"use client";

import { useState } from "react";

export const HydrationCounter = () => {
  const [count, setCount] = useState(0);

  return (
    <section>
      <output data-testid="hydration-counter">{count}</output>
      <button
        data-testid="hydration-counter-button"
        onClick={() => setCount((currentCount) => currentCount + 1)}
        type="button"
      >
        Increment hydration counter
      </button>
    </section>
  );
};
