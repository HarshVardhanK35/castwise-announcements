<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type { StatusListAppConfig } from "../announcementsTypes.ts";
import StatusIcon from "./statusList/StatusIcon.vue";
import DiscountTag from "./statusList/DiscountTag.vue";
import {
  STATUS_LABEL,
  boardScale,
  buildItems,
  scaleGrid,
  scaleList,
  scaleSpot,
  shapeFor,
  spotSizes,
  type BoardItem,
  type ScreenShape,
} from "./statusList/statusListData.ts";
import "./statusList/statusList.css";

// Pure rendering component: takes a resolved config and draws the board.
// Knows nothing about Ignition/postMessage — that wiring lives in App.vue.
// Ported from the design's own status-list.css / status-list-reference.html
// (SPEC.md) rather than approximated from screenshots; class names (sl-*)
// match that source on purpose.
const props = defineProps<{ config: StatusListAppConfig }>();

const FLASH_MS = 3500;

const rootEl = ref<HTMLElement | null>(null);
const shape = ref<ScreenShape>(shapeFor(16, 9));

// Ticks once a second so time-based visuals (flash ending)
// update without anything else changing.
const now = ref(Date.now());
let timer: number | undefined;
let resizeObserver: ResizeObserver | null = null;

function measure() {
  const el = rootEl.value;
  if (el && el.clientWidth && el.clientHeight) {
    shape.value = shapeFor(el.clientWidth, el.clientHeight);
  }
}

onMounted(() => {
  measure();
  timer = window.setInterval(() => (now.value = Date.now()), 1000);
  resizeObserver = new ResizeObserver(measure);
  if (rootEl.value) resizeObserver.observe(rootEl.value);
});
onUnmounted(() => {
  window.clearInterval(timer);
  resizeObserver?.disconnect();
});

// ---- change tracking (row flash on status change / new product) ----
// The config is the only data source, so "something changed" means a new
// config arrived whose items differ from the previous one. The very first
// config never counts as a change (nothing to compare against).
const flashes = reactive<Record<string, number>>({});
let prev: Map<string, { status: string; named: boolean }> | null = null;
let prevSignature = "";

function signature(c: StatusListAppConfig) {
  return JSON.stringify([c.items, c.priority, c.banner, c.bannerText, c.title]);
}

function snapshot(c: StatusListAppConfig) {
  return new Map(c.items.map((it) => [it.id, { status: it.status, named: !!it.name.trim() }]));
}

watch(
  () => props.config,
  (c) => {
    const sig = signature(c);
    if (prev && sig !== prevSignature) {
      const at = Date.now();
      for (const it of c.items) {
        const before = prev.get(it.id);
        // A status change, or a product just added / first named, flashes
        // its row (same wash the design used for a newly added item).
        const added = !before || (!before.named && !!it.name.trim());
        if (added ? !!it.name.trim() : before.status !== it.status) flashes[it.id] = at;
      }
      now.value = at;
    }
    prev = snapshot(c);
    prevSignature = sig;
  },
  { immediate: true },
);

// ---- derived render data ----
const items = computed(() => buildItems(props.config));
const n = computed(() => items.value.length);
const discOn = computed(() => props.config.purpose === "customers");
const mode = computed(() => (n.value <= 3 ? "spot" : props.config.layout === "Grid" ? "grid" : "list"));

const fs = computed(() => {
  const base = boardScale(n.value);
  const lc = n.value <= 5 ? 1 : shape.value.lc;
  // 4:3 single-column lists with 7+ rows shrink 20% so rows breathe.
  return mode.value === "list" && lc === 1 && n.value > 6 ? base * shape.value.dens : base;
});

const listCols = computed(() => (n.value <= 5 ? 1 : shape.value.lc));
const columns = computed(() => {
  const lc = listCols.value;
  const per = Math.ceil(n.value / lc);
  return Array.from({ length: lc }, (_, c) => items.value.slice(c * per, c * per + per));
});
const ledgerCols = computed(() =>
  discOn.value
    ? "minmax(0,1.5fr) minmax(max-content,1fr) minmax(max-content,1fr)"
    : "minmax(0,1.5fr) minmax(max-content,1fr)",
);
const nameFs = computed(() => (listCols.value === 2 ? "1.2em" : "1.3em"));

const gridCols = computed(() => Math.min(shape.value.gc, n.value));
const gridRows = computed(() => Math.ceil(n.value / gridCols.value));

const spotVars = computed(() => {
  const s = spotSizes(shape.value, n.value);
  const repeat = `repeat(${n.value},minmax(0,1fr))`;
  const tall = shape.value.tall;
  return {
    "--sp-cols": tall ? "minmax(0,1fr)" : repeat,
    "--sp-rows": tall ? repeat : "minmax(0,1fr)",
    "--sp-name": s.name,
    "--sp-tag": s.tag,
    "--sp-status": s.status,
    "--sp-gap": s.gap,
  };
});

const bannerShown = computed(() => props.config.banner && !!props.config.bannerText.trim());

// Per-item visual flags (reference: itemFlags).
function flags(it: BoardItem) {
  const c = props.config;
  const out = it.status === "out";
  const dim = (out && c.dimOutOfStock) || it.status === "empty";
  const flashAt = flashes[it.key];
  return {
    hasDisc: discOn.value && !!it.tier,
    dim,
    struck: out && c.dimOutOfStock,
    flashing: c.rowFlash && !!flashAt && now.value - flashAt < FLASH_MS,
    pulsing: c.outOfStockPulse && out,
    shimmer: c.bigDealShimmer && discOn.value && it.tier === "big",
  };
}

// Editor-only cue class (draft / editing) — see statusList.css.
const cueClass = (it: BoardItem) => (it.cue ? `is-${it.cue}` : "");

const nameClass = (it: BoardItem) => {
  const f = flags(it);
  return { "is-dim": f.dim, "is-struck": f.struck };
};
</script>

<template>
  <div
    ref="rootEl"
    class="sl-screen"
    :data-theme="config.theme"
    :style="{ '--sl-font': `'${config.font}', system-ui, sans-serif` }"
  >
    <div class="sl-board" :style="{ '--fs': fs }">
      <div class="sl-head">
        <div class="sl-title">{{ config.title }}</div>
      </div>

      <div v-if="bannerShown" class="sl-banner">
        <svg viewBox="0 0 256 256">
          <path
            d="M248 120a48.05 48.05 0 0 0-48-48h-39.8c-2.91-.17-53.62-3.74-101.91-44.24A16 16 0 0 0 32 40v160a16 16 0 0 0 26.29 12.25c37.77-31.68 77-40.76 93.71-43.3v31.72A16 16 0 0 0 159.12 214l11 7.33A16 16 0 0 0 194.5 212l11.77-44.36A48.07 48.07 0 0 0 248 120Z"
          />
        </svg>
        <span>{{ config.bannerText }}</span>
      </div>

      <!-- Spotlight: 1-3 items, replaces both List and Grid (SPEC §6.3) -->
      <div v-if="mode === 'spot'" class="sl-spot" :style="spotVars">
        <div
          v-for="it in items"
          :key="it.key"
          class="sl-card"
          :class="[{ 'is-flashing': flags(it).flashing }, cueClass(it)]"
          :data-status="it.status"
        >
          <div class="sl-card-bar" />
          <div class="sl-card-pill">
            <StatusIcon :status="it.status" :pulsing="flags(it).pulsing" />
            <span :class="{ 'is-pulsing': flags(it).pulsing }">{{ STATUS_LABEL[it.status] }}</span>
          </div>
          <div
            class="sl-card-name"
            :class="nameClass(it)"
            :style="{ '--name-scale': scaleSpot(it.name.length) }"
          >
            {{ it.name }}
          </div>
          <DiscountTag
            v-if="flags(it).hasDisc && it.tier"
            :tier="it.tier"
            :pct="it.pct"
            :shimmer="flags(it).shimmer"
          />
        </div>
      </div>

      <!-- List ("Ledger") view (SPEC §6.1) -->
      <div v-else-if="mode === 'list'" class="sl-list">
        <div
          v-for="(col, c) in columns"
          :key="c"
          class="sl-col"
          :style="{ '--cols': ledgerCols, '--name-fs': nameFs }"
        >
          <div class="sl-col-head">
            <span>Item</span><span>Status</span><span v-if="discOn">Offer</span>
          </div>
          <div
            v-for="it in col"
            :key="it.key"
            class="sl-row"
            :class="[{ 'is-flashing': flags(it).flashing }, cueClass(it)]"
            :data-status="it.status"
          >
            <div
              class="sl-row-name"
              :class="nameClass(it)"
              :style="{ '--name-scale': scaleList(it.name.length) }"
            >
              {{ it.name }}
            </div>
            <div class="sl-row-status">
              <StatusIcon :status="it.status" :pulsing="flags(it).pulsing" />
              <span :class="{ 'is-pulsing': flags(it).pulsing }">{{ STATUS_LABEL[it.status] }}</span>
            </div>
            <template v-if="discOn">
              <div v-if="flags(it).hasDisc && it.tier" class="sl-row-offer">
                <DiscountTag :tier="it.tier" :pct="it.pct" :shimmer="flags(it).shimmer" />
              </div>
              <span v-else class="sl-row-none" />
            </template>
          </div>
        </div>
      </div>

      <!-- Grid view (SPEC §6.2) -->
      <div v-else class="sl-grid" :style="{ '--gc': gridCols, '--gr': gridRows }">
        <div
          v-for="it in items"
          :key="it.key"
          class="sl-tile"
          :class="[{ 'is-flashing': flags(it).flashing }, cueClass(it)]"
          :data-status="it.status"
        >
          <div class="sl-tile-top">
            <div class="sl-pill">
              <StatusIcon :status="it.status" :pulsing="flags(it).pulsing" />
              <span :class="{ 'is-pulsing': flags(it).pulsing }">{{ STATUS_LABEL[it.status] }}</span>
            </div>
          </div>
          <div class="sl-tile-name">
            <div :class="nameClass(it)" :style="{ '--name-scale': scaleGrid(it.name.length) }">
              {{ it.name }}
            </div>
          </div>
          <div class="sl-tile-offer" :style="{ '--tag-row-h': discOn ? '1.45em' : '0' }">
            <DiscountTag
              v-if="flags(it).hasDisc && it.tier"
              :tier="it.tier"
              :pct="it.pct"
              :shimmer="flags(it).shimmer"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
