import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { RotatingNoticesAppConfig } from "../../announcementsTypes";

const REALERT_MS: Record<string, number> = {
  Off: 0,
  "10 s": 10_000,
  "30 s": 30_000,
  "1 min": 60_000,
  "2 min": 120_000,
};

// Spec §9.4: first sweep 1.5s after load, then at the chosen interval;
// trigger attribute removed after 1.9s (the band animation itself runs
// 1.8s — the extra 0.1s in the spec's own JS is just cleanup margin).
export function useRealertSweep(config: Ref<RotatingNoticesAppConfig>) {
  const sweeping = ref(false);
  let realertTimer: ReturnType<typeof setInterval> | null = null;
  let firstRunTimer: ReturnType<typeof setTimeout> | null = null;

  function runSweep() {
    sweeping.value = true;
    setTimeout(() => {
      sweeping.value = false;
    }, 1900);
  }

  function setupTimer() {
    if (realertTimer) clearInterval(realertTimer);
    if (firstRunTimer) clearTimeout(firstRunTimer);
    const ms = REALERT_MS[config.value.urgentRealertInterval] ?? 0;
    if (!ms || config.value.reduceMotion) return;
    firstRunTimer = setTimeout(() => {
      runSweep();
      realertTimer = setInterval(runSweep, ms);
    }, 1500);
  }

  watch(() => [config.value.urgentRealertInterval, config.value.reduceMotion], setupTimer);
  onMounted(setupTimer);
  onUnmounted(() => {
    if (realertTimer) clearInterval(realertTimer);
    if (firstRunTimer) clearTimeout(firstRunTimer);
  });

  return { sweeping };
}
