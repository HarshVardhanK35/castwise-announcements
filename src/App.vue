<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { init, watchHostConfig, VERSION as IGNITION_VERSION } from "@castwise/ignition";
import type { RotatingNoticesAppConfig } from "./announcementsTypes.ts";
import RotatingNoticesWidget from "./components/RotatingNoticesWidget.vue";

// Own console prefix, distinct from Ignition's own "[IGNITION]" logs — so
// devtools makes it obvious which layer (this app vs. the engine) a given
// line came from.
const log = (...args: unknown[]) => console.log("[ANNOUNCEMENTS]", ...args);

// Real config comes from DFM over postMessage, not a shared global — DFM
// and this app run on different ports (different origins) while both are
// in dev, and a real deployed app will be on a different origin too, so a
// plain `window.__APP_CONFIG__` global wouldn't be reachable from inside
// this iframe at all. Used only when opened directly (not embedded), since
// there's no host to hand a handshake to in that case.
const DEFAULT_CONFIG: RotatingNoticesAppConfig = {
  template: "rotating-notices",
  theme: "dark",
  font: "Inter",
  boards: [
    {
      id: "demo",
      tierWithTwo: "None",
      urgent: ["Fire alarm test at 2:00 PM — no evacuation needed"],
      warning: ["Wet floors in the east corridor until 11:00 AM"],
      info: ["Guest Wi-Fi: LobbyGuest · password at the front desk"],
      duration: 10,
    },
  ],
  staggeredEntrance: true,
  urgentGlowPulse: true,
  newTagDuration: "10 min",
  urgentRealertInterval: "2 min",
  criticalMode: false,
  reduceMotion: false,
  audio: "None",
};

const appConfig = ref<RotatingNoticesAppConfig>(DEFAULT_CONFIG);
const status = ref<"loading" | "ready">("loading");
let hasLoadedOnce = false;
let unwatchHostConfig: (() => void) | null = null;

// Like Clock, this app never fetches anything external — every message is
// already in the config itself — so APP_LOADING/APP_LOAD fire back-to-back
// almost instantly on a reload. Sent anyway, every time, for the same
// shared DFM-side spinner protocol every app uses.
async function activate(config: RotatingNoticesAppConfig) {
  log(hasLoadedOnce ? "config changed" : "activating for the first time", config);
  if (hasLoadedOnce) {
    window.parent?.postMessage({ type: "APP_LOADING" }, "*");
  }

  appConfig.value = config;
  status.value = "ready";

  const firstLoad = !hasLoadedOnce;
  if (firstLoad) {
    hasLoadedOnce = true;
    await init({ appName: "announcements" });
    log(`[ANNOUNCEMENTS | E${IGNITION_VERSION}] bootstrap:ready`);
  }

  log("posting APP_LOAD to parent");
  window.parent?.postMessage({ type: "APP_LOAD" }, "*");
}

onMounted(() => {
  log("mounted");

  if (window.parent === window) {
    log("not embedded — using default config");
    activate(DEFAULT_CONFIG);
  } else {
    log("embedded — sent APP_READY, waiting for host config");
    unwatchHostConfig = watchHostConfig((config) => {
      log("received config from host", config);
      activate(config as unknown as RotatingNoticesAppConfig);
    });
  }
});

onUnmounted(() => {
  unwatchHostConfig?.();
});
</script>

<template>
  <RotatingNoticesWidget v-if="status === 'ready'" :config="appConfig" />
</template>
