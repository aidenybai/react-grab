import { createSignal } from "solid-js";

export const SolidLogoCard = () => {
  const [isSelected, setIsSelected] = createSignal(false);

  return (
    <button
      id="solid-logo-button"
      type="button"
      class="framework-logo-button"
      onClick={() => setIsSelected((previous) => !previous)}
      aria-pressed={isSelected()}
    >
      <svg
        viewBox="0 0 166 155.3"
        class="framework-logo"
        data-framework-logo="solid"
      >
        <path
          d="M163 35S110-4 69 5l-3 1c-6 2-11 5-14 9l-2 3-15 26 26 5c11 7 25 10 38 7l46 9 18-30z"
          fill="#76b3e1"
        />
        <path
          d="M52 35l-4 1c-17 5-22 21-13 35 10 13 31 20 48 15l62-21S92 26 52 35z"
          fill="#518ac8"
        />
        <path
          d="M134 80a45 45 0 00-48-15L24 85 4 120l112 19 20-36c4-7 3-15-2-23z"
          fill="#4377bb"
        />
        <path
          d="M114 115a45 45 0 00-48-15L4 120s53 40 94 30l3-1c17-5 23-21 13-34z"
          fill="#1a336b"
        />
      </svg>
    </button>
  );
};
