<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { EventCardData, EventCardsAppConfig } from "../announcementsTypes.ts";
import EventCard from "./eventCards/EventCard.vue";
import EmptyHint from "./EmptyHint.vue";
import { dateKey } from "./eventCards/eventCardsData.ts";
import "./eventCards/eventCards.css";

// Rotates through the cards (spec §7.1) and owns "what day is it" for the
// date badge. Knows nothing about Ignition/postMessage — App.vue does that.
// Ported from the design's own event-cards.css / event-cards.js (SPEC.md).
const props = defineProps<{ config: EventCardsAppConfig }>();

// While the Manage cards modal is open, the preview pins to the card being
// typed/edited (no rotation) — editor-only, never present at real playback.
const cards = computed<EventCardData[]>(() => {
  const d = props.config.editorDraft;
  if (!d) return props.config.cards;
  return [{ ...d, id: d.id ?? "draft" }];
});
const pinned = computed(() => Boolean(props.config.editorDraft));

const index = ref(0);
// Bumped on every turn so the card remounts and its entrance replays, even
// when the same card comes round again.
const turn = ref(0);
const active = computed(() => cards.value[Math.min(index.value, cards.value.length - 1)]);

// The screen's own local calendar day. Checked once a minute (a single card
// never rotates, so nothing else would notice midnight) and on every turn —
// the badge text ("Tomorrow" -> "Today") follows it.
const today = ref(dateKey());
let clock: number | undefined;
let turnTimer: number | undefined;

function refreshToday() {
  const k = dateKey();
  if (k !== today.value) today.value = k;
}

function scheduleNext() {
  clearTimeout(turnTimer);
  if (pinned.value || cards.value.length <= 1 || !active.value) return;
  // Each card shows for its own duration, plus a beat for the exit (spec §7.1).
  const secs = Math.max(3, active.value.duration || 10);
  turnTimer = window.setTimeout(() => {
    index.value = (index.value + 1) % cards.value.length;
    turn.value += 1;
    refreshToday();
  }, secs * 1000 + 60);
}

watch([index, turn, () => cards.value.length, pinned, () => active.value?.duration], scheduleNext);

// A removed card can leave the index out of range.
watch(
  () => cards.value.length,
  (n) => {
    if (index.value >= n) index.value = 0;
  },
);

// Entering / leaving the pinned editor view starts a fresh entrance.
watch(pinned, () => {
  index.value = 0;
  turn.value += 1;
});

onMounted(() => {
  clock = window.setInterval(refreshToday, 60_000);
  scheduleNext();
});
onUnmounted(() => {
  window.clearInterval(clock);
  clearTimeout(turnTimer);
});
</script>

<template>
  <div class="ec-root" :data-theme="config.theme">
    <EventCard
      v-if="active"
      :key="`${active.id}-${turn}`"
      :card="active"
      :fx="config.effects"
      :reduce-motion="config.reduceMotion"
      :theme="config.theme"
      :today="today"
    />
    <EmptyHint v-else-if="config.editorPreview" :theme="config.theme" title="No cards yet"
      text="Click Add card and create your first card to see it here." />
  </div>
</template>
