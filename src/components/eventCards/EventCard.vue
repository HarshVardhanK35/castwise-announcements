<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Component } from "vue";
import { Snowflake, Sparkles } from "@lucide/vue";
import type { EventCardData, EventCardsEffects } from "../../announcementsTypes.ts";
import { MAX_BY_ROLE, TYPES, autoBadge, fontOf, fontStack, rnd, sizedImage } from "./eventCardsData.ts";
import { playCard } from "./cardEffects.ts";

// One card on the screen, full-bleed (design SPEC §2-§4). Pure rendering + the
// entrance: knows nothing about rotation or Ignition — EventCardsWidget.vue
// remounts it (via :key) for every turn, which replays the entrance. All sizes
// come from the screen (see eventCards.css), so nothing here is in px.
const props = defineProps<{
  card: EventCardData;
  fx: EventCardsEffects;
  reduceMotion: boolean;
  theme: "dark" | "light";
  // Local calendar day (YYYY-MM-DD) — the badge text is derived from it.
  today: string;
}>();

const rootEl = ref<HTMLElement | null>(null);
const motion = computed(() => !props.reduceMotion);
const info = computed(() => TYPES[props.card.type]);
const font = computed(() => fontOf(props.card.font));

// Sub line only exists on the types that have one (Welcome role,
// Congratulations achievement).
const hasSub = computed(() => props.card.type === "welcome" || props.card.type === "congrats");

// SPEC §3.1 length rules: longer text gets smaller type, never truncated.
const view = computed(() => {
  const title = props.card.title.slice(0, MAX_BY_ROLE.title);
  const sub = hasSub.value ? props.card.sub.slice(0, MAX_BY_ROLE.sub) : "";
  const body = props.card.message.slice(0, MAX_BY_ROLE.body);
  const tl = title.length;
  const fit = tl <= 12 ? 1 : tl <= 20 ? 0.82 : tl <= 32 ? 0.66 : 0.54;
  const big = props.fx.bigHead ? (tl <= 20 ? 1.15 : 1.05) : 1;
  const sfit = sub.length <= 30 ? 1 : sub.length <= 45 ? 0.9 : 0.8;
  const bfit = body.length <= 80 ? 1 : body.length <= 120 ? 0.9 : 0.8;
  return {
    sub,
    body,
    words: (title || info.value.titlePlaceholder).split(/\s+/).filter(Boolean),
    style: {
      "--ec-card-font": fontStack(font.value.name),
      "--ec-title-weight": String(font.value.weight),
      "--ec-title-tracking": font.value.tracking,
      "--fscale": String(font.value.scale),
      "--fit": String(fit),
      "--big": String(big),
      "--sfit": String(sfit),
      "--bfit": String(bfit),
    },
  };
});

const badge = computed(() => autoBadge(props.card.type, props.card.eventDate, props.today));

// A library image can be deleted later — probe it, and show no photo (a
// centred card) instead of a broken image.
const imgOk = ref(true);
watch(
  () => props.card.image?.url,
  (url) => {
    imgOk.value = true;
    if (!url) return;
    const probe = new Image();
    probe.onerror = () => {
      imgOk.value = false;
    };
    probe.src = sizedImage(url);
  },
  { immediate: true },
);
const hasImg = computed(() => props.card.showImage && Boolean(props.card.image?.url) && imgOk.value);
const imgUrl = computed(() => (props.card.image ? sizedImage(props.card.image.url) : ""));

interface Particle {
  key: number;
  icon: Component | null;
  style: Record<string, string>;
}

// SPEC §4: 12 rising dots, or (Holiday + its effect) 14 falling icons.
// Sizes are in --u, so they scale with the screen. Deterministic placement,
// so a render never moves them.
const particles = computed<Particle[]>(() => {
  const holiday = props.card.type === "holiday" && props.fx.holidayFx;
  if (props.reduceMotion || !(props.fx.particles || holiday)) return [];
  if (holiday) {
    return Array.from({ length: 14 }, (_, i) => ({
      key: i,
      icon: i % 2 ? Sparkles : Snowflake,
      style: {
        left: `${(rnd(i, 1.7) * 96).toFixed(1)}%`,
        top: "-6%",
        fontSize: `calc(var(--u) * ${(3 + rnd(i, 5.3) * 3).toFixed(2)})`,
        color: `var(${i % 2 ? "--t-c2" : "--t-c1"})`,
        animation: `ec-fall ${(8 + rnd(i, 2.2) * 6).toFixed(1)}s linear ${(-rnd(i, 4.4) * 12).toFixed(1)}s infinite`,
      },
    }));
  }
  return Array.from({ length: 12 }, (_, i) => {
    const size = `calc(var(--u) * ${(1 + rnd(i, 3.1) * 1.6).toFixed(2)})`;
    return {
      key: i,
      icon: null,
      style: {
        left: `${(rnd(i, 1.7) * 96).toFixed(1)}%`,
        top: `${(88 + rnd(i, 5.5) * 14).toFixed(1)}%`,
        width: size,
        height: size,
        background: `var(${i % 2 ? "--t-particle-2" : "--t-particle-1"})`,
        animation: `ec-rise ${(9 + rnd(i, 2.2) * 7).toFixed(1)}s ease-in ${(-rnd(i, 4.4) * 14).toFixed(1)}s infinite`,
      },
    };
  });
});

// ---- Entrance. Plays on mount (the widget remounts per turn), and again —
// after a beat — whenever something structural changes (not while typing text,
// not for font / date / duration).
let cancelPlay: (() => void) | null = null;
let timer: number | undefined;

function play() {
  cancelPlay?.();
  if (!rootEl.value) return;
  cancelPlay = playCard(rootEl.value, {
    type: props.card.type,
    fx: props.fx,
    reduce: props.reduceMotion,
  });
}

const playSig = computed(() =>
  [props.card.id, props.card.type, hasImg.value, JSON.stringify(props.fx), props.reduceMotion].join("|"),
);

onMounted(play);
watch(playSig, () => {
  clearTimeout(timer);
  timer = window.setTimeout(play, 30);
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  cancelPlay?.();
});
</script>

<template>
  <div
    ref="rootEl"
    class="ec-card"
    :class="[
      `ec-type-${card.type}`,
      {
        'ec-card--no-photo': !hasImg,
        'ec-card--grad-head': fx.gradHead,
        'ec-card--glow-anim': motion && fx.glow,
      },
    ]"
    :style="view.style"
  >
    <div class="ec-card__glow" aria-hidden="true" />

    <div v-if="particles.length" class="ec-card__particles" aria-hidden="true">
      <i v-for="p in particles" :key="p.key" class="ec-particle" :style="p.style">
        <component :is="p.icon" v-if="p.icon" />
      </i>
    </div>

    <div class="ec-card__content">
      <div v-if="hasImg" class="ec-photo" data-fx="photo">
        <div class="ec-photo__img" :style="{ backgroundImage: `url('${imgUrl}')` }" />
      </div>

      <div class="ec-card__text">
        <span v-if="fx.badge" class="ec-badge" data-fx="badge">
          <span class="ec-badge__dot" />{{ badge }}
        </span>
        <span class="ec-kicker" data-fx="rise" data-delay="220">
          <span class="ec-kicker__icon" data-fx="icon"><component :is="info.icon" /></span>
          {{ info.kicker }}
        </span>
        <span class="ec-rule" data-fx="rule" />
        <span class="ec-title">
          <span
            v-for="(w, i) in view.words"
            :key="i"
            class="ec-title__word"
            data-fx="word"
            :data-i="i"
            :data-count="/\d/.test(w) ? w : ''"
            >{{ w }}</span
          >
        </span>
        <span v-if="view.sub" class="ec-sub" data-fx="rise" :data-delay="560 + view.words.length * 90">{{ view.sub }}</span>
        <span v-if="view.body" class="ec-message" data-fx="rise" :data-delay="660 + view.words.length * 90">{{ view.body }}</span>
      </div>
    </div>

    <div class="ec-burst" data-fx="burst" aria-hidden="true" />
  </div>
</template>
