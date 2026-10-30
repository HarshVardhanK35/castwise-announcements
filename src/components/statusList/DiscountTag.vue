<script setup lang="ts">
import type { Tier } from "./statusListData.ts";

// "−40% OFF" tag (SPEC §3.3 / §6). Sizes are set per context by the parent
// view's CSS (.sl-row .sl-tag, .sl-tile .sl-tag, .sl-card .sl-tag).
defineProps<{ tier: Tier; pct: number; shimmer: boolean }>();
</script>

<template>
  <span class="sl-tag" :class="{ 'is-shimmer': shimmer }" :data-tier="tier">
    <span>−{{ pct }}%</span><span class="off">off</span>
  </span>
</template>
