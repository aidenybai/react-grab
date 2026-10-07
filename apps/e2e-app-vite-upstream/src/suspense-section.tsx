import { lazy, Suspense, useState } from "react";
import { SUSPENSE_REVEAL_DELAY_MS } from "./constants";

const SuspenseRevealedTarget = () => (
  <p data-testid="suspense-revealed-target">Suspense content revealed</p>
);

const LazySuspenseTarget = lazy(
  () =>
    new Promise<SuspenseTargetModule>((resolve) => {
      setTimeout(() => {
        resolve({ default: SuspenseRevealedTarget });
      }, SUSPENSE_REVEAL_DELAY_MS);
    }),
);

export const SuspenseSection = () => {
  const [didTriggerSuspense, setDidTriggerSuspense] = useState(false);

  return (
    <section>
      <h2>Suspense</h2>
      <button
        data-testid="suspense-trigger"
        onClick={() => setDidTriggerSuspense(true)}
        type="button"
      >
        Load suspended content
      </button>
      {didTriggerSuspense ? (
        <Suspense fallback={<p data-testid="suspense-fallback">Loading suspended content</p>}>
          <LazySuspenseTarget />
        </Suspense>
      ) : null}
    </section>
  );
};
