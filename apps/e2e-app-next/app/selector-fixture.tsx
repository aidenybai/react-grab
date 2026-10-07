"use client";

export const SelectorFixture = () => (
  <nav aria-label="Selector fixture links">
    <a
      aria-label="Duplicate semantic destination"
      data-selector-special={"quotes\"' brackets[] colon:# slash/ check✓"}
      data-selector-value={'quote" slash/ brackets[] colon: unicode✓'}
      data-testid="selector-special-target"
      href="/detail?fixture=quote%22%5Bitem%5D%3Atwo%2F%E2%9C%93"
    >
      Open selector detail
    </a>
    <a
      aria-label="Duplicate semantic destination"
      data-testid="selector-special-duplicate"
      href="/detail?fixture=quote%22%5Bitem%5D%3Atwo%2F%E2%9C%93"
    >
      Open selector detail
    </a>
  </nav>
);
