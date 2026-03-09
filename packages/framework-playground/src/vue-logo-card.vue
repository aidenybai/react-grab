<script setup>
import { ref } from "vue";

const selectionCount = ref(0);

const incrementSelectionCount = () => {
  selectionCount.value += 1;
};
</script>

<template>
  <button
    id="vue-logo-button"
    type="button"
    class="framework-logo-button"
    @click="incrementSelectionCount"
  >
    <svg viewBox="0 0 100 100" class="framework-logo" data-framework-logo="vue">
      <path d="M10 10H31L50 42L69 10H90L50 78Z" fill="#41b883" />
      <path d="M24 10H40L50 28L60 10H76L50 55Z" fill="#35495e" />
    </svg>
    <span class="framework-logo__name">Vue</span>
    <span class="framework-logo__count">Selections: {{ selectionCount }}</span>
  </button>
</template>
