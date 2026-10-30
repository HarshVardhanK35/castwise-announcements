<script setup lang="ts">
import { STATUS_ICON, type ItemStatus } from "./statusListData.ts";

// SPEC §5.1: shape filled + stroked in the status colour, mark stroked on
// top. Colour comes from CSS (--c on the nearest [data-status] ancestor).
defineProps<{ status: ItemStatus; pulsing?: boolean }>();
</script>

<template>
  <svg v-if="status === 'empty'" class="sl-icon" :class="{ 'is-pulsing': pulsing }" viewBox="0 0 24 24">
    <circle class="ring" cx="12" cy="12" r="9" />
  </svg>
  <svg v-else class="sl-icon" :class="{ 'is-pulsing': pulsing }" viewBox="0 0 24 24">
    <path class="shape" :d="STATUS_ICON[status].shape" />
    <path class="mark" :d="STATUS_ICON[status].mark" />
  </svg>
</template>
