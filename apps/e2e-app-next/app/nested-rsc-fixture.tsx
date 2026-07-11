import { NestedClientTarget } from "./nested-client-target";

const NestedRscLayer = () => (
  <div data-testid="nested-rsc-target">
    <NestedClientTarget />
  </div>
);

export const NestedRscFixture = () => (
  <section>
    <NestedRscLayer />
  </section>
);
