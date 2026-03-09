<script>
  let counterValue = 0;

  const incrementCounter = () => {
    counterValue += 1;
  };
</script>

<main style="padding: 24px; font-family: Inter, sans-serif">
  <h1>Svelte Runtime Playground</h1>
  <p>Use this app to test React Grab source mapping with Svelte.</p>
  <button type="button" on:click={incrementCounter}>
    Count: {counterValue}
  </button>
</main>
