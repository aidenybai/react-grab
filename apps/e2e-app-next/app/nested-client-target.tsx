"use client";

import { useState } from "react";

export const NestedClientTarget = () => {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <button
      data-testid="nested-rsc-client-target"
      onClick={() => setActivationCount((currentCount) => currentCount + 1)}
      type="button"
    >
      Nested RSC client target {activationCount}
    </button>
  );
};
