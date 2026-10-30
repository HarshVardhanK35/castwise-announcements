import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

// Exact algorithm from Rotating-Notices-Spec.md §1 / rotating-notices.css's
// own fitAll(): --u (the base unit every size is a multiple of) is set per
// screen SHAPE, then JS lowers it by 0.5px per step (floor 6px) while the
// board overflows. Nothing scrolls, nothing ellipsizes.
//
// Base --u is a FIXED production value per shape (spec §1), not a cqmin
// formula — this is the key thing earlier passes here got wrong by
// approximating with container-query units. Confirmed from the design's
// own preview->production scaling (e.g. 16:9 preview 768px wide -> 34px u;
// production 1920px wide -> 85px u; 34/768 === 85/1920, same ratio): u
// scales linearly with the container's own width relative to that shape's
// reference (production) width. That ratio is reproduced here directly
// from real container measurements instead of hardcoding a px value that
// would only be correct at one exact size.
const SHAPES = [
  // Ordered widest-aspect first; first match wins.
  { name: "landscape-169" as const, minAspect: 1.5, baseU: 85, refWidth: 1920 },
  { name: "landscape-43" as const, minAspect: 1.15, baseU: 72.5, refWidth: 1440 },
  { name: "portrait-916" as const, minAspect: 0, baseU: 84, refWidth: 1080 },
];

export type BoardShape = (typeof SHAPES)[number]["name"];

export function useAutoFit(rootEl: Ref<HTMLElement | null>, watchTarget: Ref<unknown>) {
  const baseU = ref(85);
  const u = ref(85);
  const shape = ref<BoardShape>("landscape-169");
  let resizeObserver: ResizeObserver | null = null;
  let fitRaf = 0;

  function recomputeBase() {
    if (!rootEl.value) return;
    const { clientWidth: w, clientHeight: h } = rootEl.value;
    if (!w || !h) return;
    const aspect = w / h;
    const matched = SHAPES.find((s) => aspect >= s.minAspect) ?? SHAPES[SHAPES.length - 1];
    shape.value = matched.name;
    baseU.value = matched.baseU * (w / matched.refWidth);
  }

  function fits() {
    if (!rootEl.value) return true;
    return (
      rootEl.value.scrollHeight <= rootEl.value.clientHeight + 1 &&
      rootEl.value.scrollWidth <= rootEl.value.clientWidth + 1
    );
  }

  function fit() {
    recomputeBase();
    u.value = baseU.value;
    let guard = 0;
    // Re-measures synchronously each step (DOM already reflects the new
    // --u immediately since it's a plain ref driving inline style, no
    // nextTick needed the way a class-toggle approach would).
    while (u.value > 6 && !fits() && guard < 300) {
      u.value -= 0.5;
      guard += 1;
    }
  }

  function scheduleFit() {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fit);
  }

  watch(watchTarget, () => scheduleFit());

  onMounted(() => {
    scheduleFit();
    resizeObserver = new ResizeObserver(() => scheduleFit());
    if (rootEl.value) resizeObserver.observe(rootEl.value);
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => scheduleFit());
    }
  });

  onUnmounted(() => {
    cancelAnimationFrame(fitRaf);
    resizeObserver?.disconnect();
  });

  return { u, shape };
}
