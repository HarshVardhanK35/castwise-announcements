<script setup lang="ts">
import { computed, toRef, ref } from "vue";
import type { RotatingNoticesAppConfig } from "../announcementsTypes.ts";
import { useBoardRotation } from "./rotatingNotices/useBoardRotation.ts";
import { useAutoFit } from "./rotatingNotices/useAutoFit.ts";
import { useRealertSweep } from "./rotatingNotices/useRealertSweep.ts";
import CriticalBar from "./rotatingNotices/CriticalBar.vue";
import NoticeCardItem from "./rotatingNotices/NoticeCardItem.vue";

// Pure rendering component: takes a resolved config and draws the board.
// Knows nothing about Ignition/postMessage — that wiring lives in App.vue.
// Ported directly from the design's own rotating-notices.css/.html
// reference files (Rotating-Notices-Spec.md) rather than approximated from
// screenshots — class names (rn-board, rn-card, etc.) match that source on
// purpose, so the two can be diffed directly if the spec ever changes.
const props = defineProps<{ config: RotatingNoticesAppConfig }>();
const config = toRef(props, "config");

const { cards } = useBoardRotation(config);
const { sweeping } = useRealertSweep(config);

const rootEl = ref<HTMLElement | null>(null);
const { u, shape } = useAutoFit(rootEl, cards);

const shapeClass = computed(() => {
  if (shape.value === "landscape-169") return "rn-board--169";
  if (shape.value === "landscape-43") return "rn-board--43";
  return "rn-board--portrait";
});
const orientation = computed<"landscape" | "portrait">(() =>
  shape.value === "portrait-916" ? "portrait" : "landscape",
);

// NEW tag (spec §9.3): a pill shown next to a tier label for N minutes
// after that message was added/edited. Not rendered — the DFM settings
// panel doesn't send a per-message timestamp (configBlob has no
// created/edited-at field), so there's no real data to base "how long ago"
// on. Revisit once that field exists; faking a timestamp here would just
// be wrong, not a real implementation.
</script>

<template>
  <div ref="rootEl" class="rn-board" :class="[shapeClass, { 'reduce-motion': config.reduceMotion }]"
    :style="{ '--u': `${u}px`, fontFamily: config.font }">
    <CriticalBar v-if="config.criticalMode" :compact="shape !== 'landscape-169'" />

    <NoticeCardItem v-for="(card, i) in cards" :key="i" :card="card" :order="i" :orientation="orientation"
      :staggered-entrance="config.staggeredEntrance" :glow-enabled="config.urgentGlowPulse" :sweeping="sweeping" />
  </div>
</template>

<style scoped>
/* Board container — spec §5. Padding/gap differ by screen shape: 16:9
   uses 0.6u padding / 0.3u gap; 4:3 uses 0.55u padding / 0.3u gap;
   portrait (9:16) uses 0.55u padding / 0.35u gap. */
.rn-board {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  color: #e6edf3;
}

.rn-board--169 {
  padding: calc(var(--u) * 0.6);
  gap: calc(var(--u) * 0.3);
}

.rn-board--43 {
  padding: calc(var(--u) * 0.55);
  gap: calc(var(--u) * 0.3);
}

.rn-board--portrait {
  padding: calc(var(--u) * 0.55);
  gap: calc(var(--u) * 0.35);
}
</style>
