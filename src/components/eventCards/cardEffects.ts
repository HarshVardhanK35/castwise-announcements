import type { EventCardType, EventCardsEffects } from "../../announcementsTypes.ts";

// The entrance + per-card-type effects, ported from event-cards.js play()
// (SPEC.md §8). Web Animations API on elements tagged `data-fx="…"` inside
// the card. Ambient effects (glow, particles) are plain CSS classes.

const EASE = "cubic-bezier(.2,.8,.2,1)";

interface IconMotion {
  duration: number;
  iterations?: number;
  keyframes: Keyframe[];
}

// Icon motion per type (delay 650ms, ease-in-out).
const ICON_MOTION: Record<EventCardType, IconMotion> = {
  birthday: {
    duration: 1000,
    keyframes: [
      { transform: "rotate(0)" }, { transform: "rotate(-16deg)" }, { transform: "rotate(13deg)" },
      { transform: "rotate(-9deg)" }, { transform: "rotate(5deg)" }, { transform: "rotate(0)" },
    ],
  },
  milestone: {
    duration: 1200,
    keyframes: [
      { transform: "translateY(-80%) rotate(-25deg)", opacity: 0 },
      { transform: "translateY(0) rotate(4deg)", opacity: 1, offset: 0.4 },
      { transform: "skewY(-10deg)", offset: 0.6 },
      { transform: "skewY(7deg)", offset: 0.8 },
      { transform: "none" },
    ],
  },
  welcome: {
    duration: 1400,
    keyframes: [
      { transform: "rotate(0)" },
      { transform: "rotate(24deg)", offset: 0.15 },
      { transform: "rotate(-8deg)", offset: 0.32 },
      { transform: "rotate(24deg)", offset: 0.5 },
      { transform: "rotate(-8deg)", offset: 0.68 },
      { transform: "rotate(0)" },
    ],
  },
  congrats: {
    duration: 1000,
    keyframes: [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-45%) scale(1.25)", offset: 0.35 },
      { transform: "translateY(0) scale(.95)", offset: 0.6 },
      { transform: "translateY(-15%) scale(1.05)", offset: 0.8 },
      { transform: "none" },
    ],
  },
  holiday: {
    duration: 900,
    iterations: 2,
    keyframes: [
      { transform: "scale(1) rotate(0)" },
      { transform: "scale(1.4) rotate(18deg)", offset: 0.5 },
      { transform: "none" },
    ],
  },
};

export interface PlayOptions {
  type: EventCardType;
  fx: EventCardsEffects;
  reduce: boolean;
}

// Plays the entrance for one card element. Returns a cancel function that
// stops everything still running (call it before replaying and on unmount).
export function playCard(card: HTMLElement, o: PlayOptions): () => void {
  const { fx, reduce } = o;
  const anims: Animation[] = [];
  let cancelled = false;

  const A = (el: Element, k: Keyframe[], opts: KeyframeAnimationOptions) => {
    try {
      const an = el.animate(k, opts);
      anims.push(an);
      return an;
    } catch {
      return null;
    }
  };
  const q = (n: string) => Array.from(card.querySelectorAll<HTMLElement>(`[data-fx="${n}"]`));
  const fade = (el: Element, d: number) =>
    A(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: d, fill: "backwards" });
  const rise = (el: Element, d: number) =>
    reduce
      ? fade(el, d)
      : A(
          el,
          [{ opacity: 0, transform: "translateY(40%)" }, { opacity: 1, transform: "none" }],
          { duration: 640, delay: d, easing: EASE, fill: "backwards" },
        );

  // ---- Entrance (spec §8 A)
  q("badge").forEach((el) => {
    if (!reduce && o.type === "welcome" && fx.welcomePop) {
      A(
        el,
        [
          { opacity: 0, transform: "scale(.3)" },
          { opacity: 1, transform: "scale(1.15)", offset: 0.6 },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 700, delay: 60, easing: EASE, fill: "backwards" },
      );
    } else rise(el, 0);
  });
  q("rise").forEach((el) => rise(el, (Number(el.dataset.i) || 0) * 130));
  // The headline comes in as one piece with the staggered reveal.
  q("word").forEach((el) => {
    if (reduce) fade(el, 260);
    else rise(el, 280);
  });

  q("burst").forEach((el) => {
    el.innerHTML = "";
  });

  if (!reduce) {
    // ---- Per card type (spec §8 C)
    q("icon").forEach((el) => {
      if (!fx.iconMotion) return;
      const m = ICON_MOTION[o.type];
      A(el, m.keyframes, {
        duration: m.duration, delay: 650, easing: "ease-in-out", iterations: m.iterations ?? 1, fill: "backwards",
      });
    });
    const pal = getComputedStyle(card);
    const colors = ["--t-c1", "--t-c2", "--t-head"].map((v) => pal.getPropertyValue(v).trim());
    q("burst").forEach((el) => {
      if (o.type === "birthday") confetti(el, colors, A);
      if (o.type === "congrats" && fx.congratsFx) fireworks(el, colors, A);
    });
    if (o.type === "milestone" && fx.countUp) {
      q("word").forEach((el) => {
        if (el.dataset.count) countUp(el, el.dataset.count, 300, () => cancelled);
      });
    }
  }

  return () => {
    cancelled = true;
    anims.forEach((a) => {
      try {
        a.cancel();
      } catch {
        /* already finished */
      }
    });
  };
}

type Animate = (el: Element, k: Keyframe[], o: KeyframeAnimationOptions) => Animation | null;

// 40 pieces from the lower left, flung up and out (spec §8 C, Birthday).
function confetti(el: HTMLElement, cols: string[], A: Animate) {
  const w = el.clientWidth;
  const h = el.clientHeight;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("span");
    const sz = w * (0.008 + Math.random() * 0.008);
    p.style.cssText = `position:absolute;left:${30 + Math.random() * 10}%;top:55%;width:${sz}px;height:${
      sz * (Math.random() < 0.5 ? 1 : 2.2)
    }px;background:${cols[i % 3]};border-radius:${Math.random() < 0.3 ? "50%" : "2px"};opacity:0`;
    el.appendChild(p);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const v = h * (0.35 + Math.random() * 0.45);
    const dx = Math.cos(ang) * v * 1.4;
    const dy = Math.sin(ang) * v;
    const r = (Math.random() - 0.5) * 1080;
    const an = A(
      p,
      [
        { opacity: 0, transform: "translate(0,0) rotate(0deg)" },
        { opacity: 1, offset: 0.04 },
        { opacity: 1, transform: `translate(${dx}px,${dy}px) rotate(${r / 2}deg)`, offset: 0.35 },
        { opacity: 0, transform: `translate(${dx * 1.3}px,${dy + h * 0.75}px) rotate(${r}deg)` },
      ],
      {
        duration: 2200 + Math.random() * 900,
        delay: 350 + Math.random() * 250,
        easing: "cubic-bezier(.15,.7,.4,1)",
        fill: "backwards",
      },
    );
    if (an) an.onfinish = () => p.remove();
  }
}

// Three bursts of 18 sparks (spec §8 C, Congratulations).
function fireworks(el: HTMLElement, cols: string[], A: Animate) {
  const w = el.clientWidth;
  const h = el.clientHeight;
  ([[0.6, 0.3, 0], [0.86, 0.72, 380], [0.72, 0.5, 760]] as const).forEach(([x, y, d]) => {
    const R = w * (0.09 + Math.random() * 0.04);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("span");
      const sz = w * 0.007;
      const ang = (i / 18) * Math.PI * 2;
      const c = cols[i % 3];
      p.style.cssText = `position:absolute;left:${x * 100}%;top:${y * 100}%;width:${sz}px;height:${sz}px;border-radius:50%;background:${c};box-shadow:0 0 ${sz * 2}px ${c};opacity:0`;
      el.appendChild(p);
      const an = A(
        p,
        [
          { opacity: 0, transform: "translate(0,0) scale(.4)" },
          { opacity: 1, offset: 0.08 },
          { opacity: 1, transform: `translate(${Math.cos(ang) * R * 0.85}px,${Math.sin(ang) * R * 0.85}px) scale(1)`, offset: 0.55 },
          { opacity: 0, transform: `translate(${Math.cos(ang) * R}px,${Math.sin(ang) * R + h * 0.06}px) scale(.6)` },
        ],
        { duration: 1300, delay: 900 + d, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" },
      );
      if (an) an.onfinish = () => p.remove();
    }
  });
}

// Milestone: a headline word containing a number counts up from 0 (spec §8 C).
function countUp(el: HTMLElement, finalText: string, delay: number, isCancelled: () => boolean) {
  const node = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
  if (!node) return;
  const m = finalText.match(/^(\D*)(\d[\d,.]*)(.*)$/);
  if (!m) return;
  const raw = m[2].replace(/,/g, "");
  const target = parseFloat(raw);
  if (!isFinite(target)) return;
  const dec = Math.min(2, (raw.split(".")[1] || "").length);
  const commas = m[2].includes(",");
  const fmt = (v: number) =>
    m[1] +
    (commas
      ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec)) +
    m[3];
  let last = fmt(0);
  node.nodeValue = last;
  const t0 = performance.now() + delay;
  const D = 1500;
  const step = (now: number) => {
    if (!node.isConnected || node.nodeValue !== last) return;
    if (isCancelled()) {
      node.nodeValue = finalText;
      return;
    }
    const k = Math.min(1, Math.max(0, (now - t0) / D));
    const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
    last = k >= 1 ? finalText : fmt(target * e);
    node.nodeValue = last;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
