<script setup lang="ts">
// Shown over the settings preview when a template has nothing to display yet
// (no boards / no cards), so the blank screen tells the user what to do.
// Editor preview only — DFM sets `editorPreview` on the preview config; a real
// screen never shows this.
defineProps<{ title: string; text: string; theme: "dark" | "light" }>();
</script>

<template>
  <div class="eh" :data-theme="theme">
    <p class="eh-title">{{ title }}</p>
    <p class="eh-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.eh {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2vmin;
  padding: 4vmin;
  text-align: center;
  background: #0d1117;
  color: #e6edf3;
  --eh-muted: #8b949e;
}
.eh[data-theme="light"] {
  background: #f6f8fa;
  color: #1f2328;
  --eh-muted: #59636e;
}
.eh-title {
  margin: 0;
  font-size: clamp(14px, 4vmin, 44px);
  font-weight: 700;
}
.eh-text {
  margin: 0;
  max-width: 34em;
  font-size: clamp(11px, 2.4vmin, 28px);
  line-height: 1.4;
  color: var(--eh-muted);
}
</style>
