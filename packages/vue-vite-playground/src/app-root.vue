<script setup>
import { ref } from "vue";

const counterValue = ref(0);

const incrementCounter = () => {
  counterValue.value += 1;
};
</script>

<template>
  <main style="padding: 24px; font-family: Inter, sans-serif">
    <h1>Vue Runtime Playground</h1>
    <p>Use this app to test React Grab source mapping with Vue.</p>
    <button type="button" @click="incrementCounter">
      Count: {{ counterValue }}
    </button>
  </main>
</template>
