"use client";

import { Suspense, use, useState } from "react";
import { CLIENT_SUSPENSE_DELAY_MS } from "./constants";

const createRevealPromise = () =>
  new Promise<string>((resolve) => {
    setTimeout(() => resolve("Suspense revealed target"), CLIENT_SUSPENSE_DELAY_MS);
  });

const SuspenseRevealedTarget = (props: SuspenseRevealedTargetProps) => (
  <button data-testid="suspense-revealed-target" type="button">
    {use(props.revealPromise)}
  </button>
);

export const ClientSuspenseFixture = () => {
  const [revealPromise, setRevealPromise] = useState<Promise<string> | null>(null);

  return (
    <section>
      <button
        data-testid="suspense-trigger"
        onClick={() => setRevealPromise(createRevealPromise())}
        type="button"
      >
        Reveal suspended target
      </button>
      <Suspense fallback={<p data-testid="suspense-fallback">Loading client target…</p>}>
        {revealPromise ? <SuspenseRevealedTarget revealPromise={revealPromise} /> : null}
      </Suspense>
    </section>
  );
};
