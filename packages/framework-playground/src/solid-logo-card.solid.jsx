import { createSignal } from "solid-js";

export const SolidLogoCard = () => {
  const [selectionCount, setSelectionCount] = createSignal(0);

  return (
    <button
      id="solid-logo-button"
      type="button"
      class="framework-logo-button"
      onClick={() =>
        setSelectionCount(
          (previousSelectionCount) => previousSelectionCount + 1,
        )
      }
    >
      <svg
        viewBox="0 0 100 100"
        class="framework-logo"
        data-framework-logo="solid"
      >
        <defs>
          <linearGradient
            id="solid-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stop-color="#76b3e1" />
            <stop offset="100%" stop-color="#518ac8" />
          </linearGradient>
        </defs>
        <path
          d="M14 24C23 13 37 11 50 15C62 18 74 17 86 9L86 38C76 47 64 50 51 47C39 44 28 45 14 56Z"
          fill="url(#solid-gradient)"
        />
        <path
          d="M14 56C27 45 39 44 51 47C64 50 76 47 86 38L86 69C76 79 63 83 49 80C36 77 25 79 14 89Z"
          fill="#76b3e1"
        />
      </svg>
      <span class="framework-logo__name">Solid</span>
      <span class="framework-logo__count">Selections: {selectionCount()}</span>
    </button>
  );
};
