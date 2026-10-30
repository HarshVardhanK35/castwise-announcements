<script setup lang="ts">
import type { NoticeCard } from "../../announcementsTypes";

// NEW tag (spec §9.3) is intentionally not wired — it needs a per-message
// "edited at" timestamp, which DFM's board config doesn't send today
// (configBlob has no created/edited-at field). Not faked.

defineOptions({ inheritAttrs: false });

// Exact per-position delays from spec §9.1 — not a computed/linear
// formula (they're hand-tuned, not evenly spaced).
const STAGGER_DELAYS = [0, 0.12, 0.28, 0.4, 0.56, 0.68];

const props = defineProps<{
  card: NoticeCard;
  order: number;
  orientation: "landscape" | "portrait";
  staggeredEntrance: boolean;
  glowEnabled: boolean;
  sweeping: boolean;
}>();

// Spec §9.2: with entrance ALSO on, the glow pulse starts 0.8s after that
// card's own entrance delay (not a flat 0.8s for every card) — e.g. a
// card entering at 0.12s has its glow start at 0.92s, confirmed directly
// in rotating-notices.css's own [data-o="1"] rule. With entrance off, the
// glow just starts immediately (no delay).
const entranceDelay = STAGGER_DELAYS[props.order] ?? 0;
const glowDelay = props.staggeredEntrance ? entranceDelay + 0.8 : 0;
</script>

<template>
  <!-- Icon per spec §8 — solid accent shape, glyph cut out in panel colour.
       Urgent: octagon. Warning: rounded triangle. Info: plain circle. -->
  <div
    class="rn-card"
    :class="[
      `rn-card--${card.tier}`,
      {
        'rn-card--portrait': orientation === 'portrait',
        'entrance-on': staggeredEntrance,
        'glow-on': card.tier === 'urgent' && glowEnabled,
        sweeping: card.tier === 'urgent' && sweeping,
      },
    ]"
    :style="{
      '--stagger-delay': staggeredEntrance ? `${entranceDelay}s` : '0s',
      '--glow-delay': `${glowDelay}s`,
    }"
    :data-o="order"
  >
    <div class="rn-icon" :class="{ 'rn-tile': card.tier !== 'info' }">
      <svg v-if="card.tier === 'urgent'" viewBox="0 0 24 24">
        <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z" style="fill: var(--sig-urgent)" />
        <rect x="10.6" y="5.8" width="2.8" height="8.6" rx="1.4" style="fill: var(--sig-panel)" />
        <circle cx="12" cy="17.6" r="1.6" style="fill: var(--sig-panel)" />
      </svg>
      <svg v-else-if="card.tier === 'warning'" viewBox="0 0 24 24">
        <path d="M10.3 3.4a2 2 0 0 1 3.4 0l8.6 15.1a2 2 0 0 1-1.7 3H3.4a2 2 0 0 1-1.7-3z" style="fill: var(--sig-warn)" />
        <rect x="10.7" y="8.4" width="2.6" height="7" rx="1.3" style="fill: var(--sig-panel)" />
        <circle cx="12" cy="18.3" r="1.45" style="fill: var(--sig-panel)" />
      </svg>
      <svg v-else viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" style="fill: var(--sig-info)" />
        <circle cx="12" cy="7.2" r="1.6" style="fill: var(--sig-panel)" />
        <rect x="10.7" y="10.2" width="2.6" height="7.6" rx="1.3" style="fill: var(--sig-panel)" />
      </svg>
    </div>

    <div class="rn-head">
      <span class="rn-label">{{ { urgent: "Urgent", warning: "Warning", info: "Info" }[card.tier] }}</span>
    </div>

    <p class="rn-msg">{{ card.text }}</p>
  </div>
</template>

<style scoped>
/* Port of rotating-notices.css's card rules (§4-§7 of the spec) — values
   are calc(var(--u) * ratio) exactly as specified, not approximated. --u
   is set on the board root by RotatingNoticesWidget.vue (useAutoFit.ts). */

.rn-card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: calc(var(--u) * 1.5) minmax(0, 1fr);
  grid-template-areas: "icon head" "icon msg";
  align-content: center;
  column-gap: calc(var(--u) * 0.45);
  row-gap: calc(var(--u) * 0.1);
  padding: var(--pv) calc(var(--u) * 0.5);
  border: 1px solid var(--bd);
  border-radius: var(--r);
  background: linear-gradient(100deg, var(--tint), var(--tint0) var(--stop)), var(--sig-panel);
  box-shadow: var(--shadow);
}

.rn-icon {
  grid-area: icon;
  align-self: center;
  justify-self: center;
  display: grid;
  place-items: center;
}
.rn-icon svg {
  display: block;
  width: var(--is);
  height: var(--is);
}
.rn-icon.rn-tile {
  width: var(--ts);
  height: var(--ts);
  border-radius: calc(var(--u) * 0.22);
  background: var(--tile);
}

.rn-head {
  grid-area: head;
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.2);
}

.rn-label {
  flex: none;
  font-size: var(--lab);
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.1;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--accent);
}

.rn-msg {
  grid-area: msg;
  margin: 0;
  font-size: var(--fs);
  font-weight: var(--fw);
  line-height: var(--lh);
  letter-spacing: var(--ls);
  overflow-wrap: anywhere;
  /* No max-width — spec §6.1: "runs the full text column", only the
     card's own right padding is the right-side space. An earlier pass
     here guessed a percentage gutter from screenshots; this was wrong. */
}

/* ---- Urgent ---- */
.rn-card--urgent {
  flex: 1 1 auto; /* grows to fill leftover board height — spec §6.2 */
  --accent: var(--sig-urgent);
  --pv: calc(var(--u) * 0.35);
  --r: calc(var(--u) * 0.28);
  --bd: rgba(240, 66, 106, 0.55);
  --tint: rgba(240, 66, 106, 0.17);
  --tint0: rgba(240, 66, 106, 0);
  --stop: 60%;
  --shadow: 0 18px 40px -14px rgba(240, 66, 106, 0.4), 0 10px 24px -8px var(--sig-sh);
  --tile: rgba(240, 66, 106, 0.15);
  --ts: calc(var(--u) * 1.5);
  --is: calc(var(--u) * 0.95);
  --lab: calc(var(--u) * 0.34);
  --fs: calc(var(--u) * 1);
  --fw: 700;
  --lh: 1.06;
  --ls: -0.022em;
}
/* ---- Warning ---- */
.rn-card--warning {
  flex: none;
  --accent: var(--sig-warn);
  --pv: calc(var(--u) * 0.3);
  --r: calc(var(--u) * 0.26);
  --bd: var(--sig-warn-b);
  --tint: rgba(227, 179, 65, 0.1);
  --tint0: rgba(227, 179, 65, 0);
  --stop: 55%;
  --shadow: 0 8px 18px -8px var(--sig-sh2);
  --tile: rgba(227, 179, 65, 0.14);
  --ts: calc(var(--u) * 1.1);
  --is: calc(var(--u) * 0.68);
  --lab: calc(var(--u) * 0.32);
  --fs: calc(var(--u) * 0.65);
  --fw: 600;
  --lh: 1.12;
  --ls: -0.015em;
}
/* ---- Info ---- */
.rn-card--info {
  flex: none;
  --accent: var(--sig-info);
  --pv: calc(var(--u) * 0.26);
  --r: calc(var(--u) * 0.24);
  --bd: var(--sig-info-b);
  --tint: rgba(63, 185, 80, 0.07);
  --tint0: rgba(63, 185, 80, 0);
  --stop: 50%;
  --shadow: none;
  --tile: transparent;
  --ts: auto;
  --is: calc(var(--u) * 0.55);
  --lab: calc(var(--u) * 0.27);
  --fs: calc(var(--u) * 0.42);
  --fw: 600;
  --lh: 1.25;
  --ls: 0;
}
/* ---- Portrait (9:16) reflow — spec §7: icon+label share the top row,
   message runs full card width below, no shared icon column. ---- */
.rn-card--portrait {
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "icon head" "msg msg";
  column-gap: calc(var(--u) * 0.3);
  row-gap: calc(var(--u) * 0.25);
  padding: calc(var(--pv) * 1.4) calc(var(--u) * 0.55);
  background: linear-gradient(170deg, var(--tint), var(--tint0) var(--stop)), var(--sig-panel);
}
.rn-card--portrait .rn-icon {
  justify-self: start;
}
.rn-card--portrait.rn-card--urgent {
  --ts: calc(var(--u) * 1.275);
  --is: calc(var(--u) * 0.8075);
  --lab: calc(var(--u) * 0.374);
  --lh: 1.08;
}
.rn-card--portrait.rn-card--warning {
  --ts: calc(var(--u) * 0.935);
  --is: calc(var(--u) * 0.578);
  --lab: calc(var(--u) * 0.352);
  --lh: 1.14;
}
.rn-card--portrait.rn-card--info {
  --is: calc(var(--u) * 0.4675);
  --lab: calc(var(--u) * 0.297);
  --lh: 1.27;
}

/* Entrance (spec §9.1) — only plays when staggeredEntrance is actually on;
   an earlier pass applied it unconditionally on every card, which the
   spec's own CSS never does (its entrance rule is scoped to
   `[data-enter="on"][data-play]`). */
.rn-card.entrance-on {
  animation: card-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: var(--stagger-delay, 0s);
}

/* Urgent glow pulse (spec §9.2) — 3.6s loop, Urgent only. Combines with
   entrance when both are on (card-in + urgent-pulse, each with its own
   delay); glow alone (entrance off) just starts immediately. */
.rn-card--urgent.glow-on {
  animation: urgent-pulse 3.6s ease-in-out infinite;
  animation-delay: var(--glow-delay, 0s);
}
.rn-card--urgent.entrance-on.glow-on {
  animation: card-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both, urgent-pulse 3.6s ease-in-out infinite;
  animation-delay: var(--stagger-delay, 0s), var(--glow-delay, 0s);
}

/* Re-alert sweep (spec §9.4). */
.rn-card--urgent::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(100deg, transparent 25%, var(--sig-sweep) 50%, transparent 75%);
  transform: translateX(-110%);
}
.rn-card--urgent.sweeping::after {
  animation: sweep 1.8s ease-in-out;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(calc(var(--u) * 0.5));
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes urgent-pulse {
  0%,
  100% {
    border-color: rgba(240, 66, 106, 0.5);
    box-shadow: 0 18px 40px -14px rgba(240, 66, 106, 0.35), 0 10px 24px -8px rgba(0, 0, 0, 0.45);
  }
  50% {
    border-color: rgba(240, 66, 106, 0.95);
    box-shadow: 0 0 0 calc(var(--u) * 0.07) rgba(240, 66, 106, 0.32), 0 18px 56px -8px rgba(240, 66, 106, 0.65);
  }
}

@keyframes sweep {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(110%);
  }
}

/* Reduce motion (spec §9.6) — explicit setting, OS preference ignored. */
:global(.reduce-motion) .rn-card,
:global(.reduce-motion) .rn-card::after {
  animation: none !important;
}
</style>
