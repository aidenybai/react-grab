"use client";

import { useState } from "react";

export const KeyedRemountFixture = () => {
  const [targetVersion, setTargetVersion] = useState(0);

  return (
    <section>
      <button
        data-testid="keyed-remount-trigger"
        onClick={() => setTargetVersion((currentVersion) => currentVersion + 1)}
        type="button"
      >
        Remount keyed target
      </button>
      <button data-testid="keyed-remount-target" key={targetVersion} type="button">
        Keyed remount target {targetVersion}
      </button>
    </section>
  );
};
