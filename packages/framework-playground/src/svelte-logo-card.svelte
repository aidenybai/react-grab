<script>
  let selectionCount = 0;

  const incrementSelectionCount = () => {
    selectionCount += 1;
  };
</script>

<button
  id="svelte-logo-button"
  type="button"
  class="framework-logo-button"
  on:click={incrementSelectionCount}
>
  <svg
    viewBox="0 0 100 100"
    class="framework-logo"
    data-framework-logo="svelte"
  >
    <circle cx="50" cy="50" r="34" fill="#ff3e00" />
    <path
      d="M63 31C58 26 51 24 44 25C35 26 29 33 29 41C29 49 35 54 43 56L50 58C54 59 56 61 56 64C56 68 52 71 47 71C42 71 38 69 35 65L28 71C33 78 40 81 49 80C60 79 67 72 67 63C67 55 62 50 53 47L46 45C42 44 40 42 40 39C40 35 43 33 48 33C52 33 56 34 59 38Z"
      fill="white"
    />
  </svg>
  <span class="framework-logo__name">Svelte</span>
  <span class="framework-logo__count">Selections: {selectionCount}</span>
</button>
