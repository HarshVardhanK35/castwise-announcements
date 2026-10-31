import type { EventCardType, EventCardsEffects } from "../../announcementsTypes.ts";

// The entrance + per-card-type effects, ported from the design's
// event-card-screen.js (SPEC §7). Web Animations API on elements tagged
// `data-fx="…"` inside the card. Ambient effects (glow, particles, flakes) are
// plain CSS. Congratulations has no shine sweep (removed by product decision).

const EASE = "cubic-bezier(.2,.8,.2,1)";

interface IconMotion {
  duration: number;
  iterations?: number;
  keyframes: Keyframe[];
}

// Icon motion per type (delay 900ms, ease-in-out).
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

  // ---- Entrance (SPEC §7.1: every type, every turn, no loop)
  q("photo").forEach((el) => {
    if (reduce) fade(el, 0);
    else {
      A(
        el,
        [
          { opacity: 0, transform: "scale(.8)" },
          { opacity: 1, transform: "scale(1.04)", offset: 0.7 },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 850, delay: 0, easing: EASE, fill: "backwards" },
      );
    }
  });
  q("badge").forEach((el) => {
    if (!reduce && o.type === "welcome" && fx.welcomePop) {
      A(
        el,
        [
          { opacity: 0, transform: "scale(.3)" },
          { opacity: 1, transform: "scale(1.15)", offset: 0.6 },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 700, delay: 120, easing: EASE, fill: "backwards" },
      );
    } else rise(el, 120);
  });
  q("rise").forEach((el) => rise(el, Number(el.dataset.delay) || 0));
  q("rule").forEach((el) => {
    if (reduce) fade(el, 320);
    else A(el, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 720, delay: 320, easing: EASE, fill: "backwards" });
  });
  q("word").forEach((el) => {
    const i = Number(el.dataset.i) || 0;
    if (reduce) fade(el, 400);
    else {
      A(
        el,
        [
          { opacity: 0, transform: "translateY(50%) rotate(3deg)", filter: "blur(6px)" },
          { opacity: 1, transform: "none", filter: "blur(0px)" },
        ],
        { duration: 680, delay: 400 + i * 90, easing: EASE, fill: "backwards" },
      );
    }
  });

  q("burst").forEach((el) => {
    el.innerHTML = "";
  });

  if (!reduce) {
    // ---- Icon motion + per-type effects (SPEC §7.2, §7.3)
    q("icon").forEach((el) => {
      if (!fx.iconMotion) return;
      const m = ICON_MOTION[o.type];
      A(el, m.keyframes, {
        duration: m.duration, delay: 900, easing: "ease-in-out", iterations: m.iterations ?? 1, fill: "backwards",
      });
    });
    const pal = getComputedStyle(card);
    const colors = ["--t-c1", "--t-c2", "--t-head"].map((v) => pal.getPropertyValue(v).trim());
    q("burst").forEach((el) => {
      if (o.type === "birthday") confetti(card, el, colors, A);
      if (o.type === "congrats" && fx.congratsFx) fireworks(card, el, colors, A);
    });
    if (o.type === "milestone" && fx.countUp) {
      q("word").forEach((el) => {
        if (el.dataset.count) countUp(el, el.dataset.count, 400, () => cancelled);
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

// Where bursts start: the centre of the photo, or the top of the headline.
function origin(card: HTMLElement) {
  const r = card.getBoundingClientRect();
  const t = card.querySelector<HTMLElement>(".ec-photo") ?? card.querySelector<HTMLElement>(".ec-title");
  const b = (t ?? card).getBoundingClientRect();
  const isPhoto = t?.classList.contains("ec-photo");
  return {
    x: b.left - r.left + b.width / 2,
    y: b.top - r.top + (isPhoto ? b.height / 2 : 0),
    w: r.width,
    h: r.height,
  };
}

// 44 pieces from the photo centre, flung up and out (SPEC §7.3, Birthday).
function confetti(card: HTMLElement, el: HTMLElement, cols: string[], A: Animate) {
  const o = origin(card);
  const m = Math.min(o.w, o.h);
  for (let i = 0; i < 44; i++) {
    const p = document.createElement("span");
    const sz = m * (0.012 + Math.random() * 0.012);
    p.style.cssText = `position:absolute;left:${o.x}px;top:${o.y}px;width:${sz}px;height:${
      sz * (Math.random() < 0.5 ? 1 : 2.2)
    }px;background:${cols[i % 3]};border-radius:${Math.random() < 0.3 ? "50%" : "2px"};opacity:0`;
    el.appendChild(p);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const v = m * (0.35 + Math.random() * 0.4);
    const dx = Math.cos(ang) * v * 1.3;
    const dy = Math.sin(ang) * v;
    const r = (Math.random() - 0.5) * 1080;
    const an = A(
      p,
      [
        { opacity: 0, transform: "translate(0,0) rotate(0deg)" },
        { opacity: 1, offset: 0.04 },
        { opacity: 1, transform: `translate(${dx}px,${dy}px) rotate(${r / 2}deg)`, offset: 0.35 },
        { opacity: 0, transform: `translate(${dx * 1.3}px,${dy + o.h * 0.7}px) rotate(${r}deg)` },
      ],
      {
        duration: 2400 + Math.random() * 900,
        delay: 500 + Math.random() * 250,
        easing: "cubic-bezier(.15,.7,.4,1)",
        fill: "backwards",
      },
    );
    if (an) an.onfinish = () => p.remove();
  }
}

// Three bursts of 18 sparks (SPEC §7.3, Congratulations).
function fireworks(card: HTMLElement, el: HTMLElement, cols: string[], A: Animate) {
  const r = card.getBoundingClientRect();
  const m = Math.min(r.width, r.height);
  ([[0.22, 0.2, 0], [0.8, 0.28, 380], [0.68, 0.78, 760]] as const).forEach(([x, y, d]) => {
    const R = m * (0.14 + Math.random() * 0.05);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("span");
      const sz = m * 0.011;
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
          { opacity: 0, transform: `translate(${Math.cos(ang) * R}px,${Math.sin(ang) * R + m * 0.06}px) scale(.6)` },
        ],
        { duration: 1300, delay: 1100 + d, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" },
      );
      if (an) an.onfinish = () => p.remove();
    }
  });
}

// Milestone: a headline word containing a number counts up from 0 (SPEC §7.3).
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
