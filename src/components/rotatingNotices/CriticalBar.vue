<script setup lang="ts">
// Spec §9.5 — full-width bar at the top of the board, bleeding to the
// screen edges via negative margin (= board's own padding). Icon is the
// Urgent octagon with colours INVERTED (panel-colour shape, accent glyph).
//
// `compact` (4:3/portrait use 0.55u board padding, not 16:9's 0.6u) is
// passed as a prop from the parent, which already knows the board shape —
// NOT done via a `:global(.rn-board--43) .rn-critical` cross-component
// selector like an earlier pass here. That selector was somehow bleeding
// its negative margin onto `.rn-board` itself (confirmed via DevTools:
// the BOARD's own computed margin showed this rule's exact values), not
// just `.rn-critical` as intended — root cause not fully pinned down, but
// avoiding `:global()` reaching across component boundaries entirely
// removes the risk rather than chasing the exact mechanism.
defineProps<{ compact: boolean }>();
</script>

<template>
  <div class="rn-critical" :class="{ 'rn-critical--compact': compact }">
    <svg viewBox="0 0 24 24">
      <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z" fill="#161b22" />
      <rect x="10.6" y="5.8" width="2.8" height="8.6" rx="1.4" fill="#f0426a" />
      <circle cx="12" cy="17.6" r="1.6" fill="#f0426a" />
    </svg>
    <span>Critical alert</span>
  </div>
</template>

<style scoped>
.rn-critical {
  flex: none;
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.25);
  margin: calc(var(--u) * -0.6) calc(var(--u) * -0.6) 0;
  padding: calc(var(--u) * 0.14) calc(var(--u) * 0.6);
  background: #f0426a;
  color: #161b22;
  font-size: calc(var(--u) * 0.3);
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
}
.rn-critical svg {
  width: 1.2em;
  height: 1.2em;
  flex: none;
  display: block;
}

.rn-critical--compact {
  margin: calc(var(--u) * -0.55) calc(var(--u) * -0.55) 0;
  padding: calc(var(--u) * 0.14) calc(var(--u) * 0.55);
}
</style>
