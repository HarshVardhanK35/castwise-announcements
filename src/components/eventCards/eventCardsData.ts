import { Cake, CalendarHeart, Flag, Hand, Trophy } from "@lucide/vue";
import type { Component } from "vue";
import type { EventCardType } from "../../announcementsTypes.ts";

// Pure data + helpers ported from event-cards.js (SPEC.md §3, §7.4) — no
// Vue state, no DOM.

export interface TypeInfo {
  label: string;
  kicker: string;
  icon: Component;
  fallbackBadge: string;
  titlePlaceholder: string;
}

// Nearest lucide equivalents of the spec's Phosphor icons.
export const TYPES: Record<EventCardType, TypeInfo> = {
  birthday: { label: "Birthday", kicker: "Happy birthday", icon: Cake, fallbackBadge: "Today", titlePlaceholder: "Name" },
  milestone: { label: "Milestone", kicker: "Milestone", icon: Flag, fallbackBadge: "New milestone", titlePlaceholder: "Milestone title" },
  welcome: { label: "Welcome", kicker: "Welcome to the team", icon: Hand, fallbackBadge: "New joiner", titlePlaceholder: "Name" },
  congrats: { label: "Congratulations", kicker: "Congratulations", icon: Trophy, fallbackBadge: "Well done", titlePlaceholder: "Name" },
  holiday: { label: "Holiday", kicker: "Celebrate", icon: CalendarHeart, fallbackBadge: "This week", titlePlaceholder: "Occasion name" },
};

// Spec §3.3 — weight/tracking style the headline; scale multiplies its size.
const FONTS: { name: string; weight: number; tracking: string; scale: number }[] = [
  { name: "Plus Jakarta Sans", weight: 700, tracking: "-.02em", scale: 1 },
  { name: "Outfit", weight: 600, tracking: "-.01em", scale: 1.02 },
  { name: "Sora", weight: 600, tracking: "-.02em", scale: 0.95 },
  { name: "Space Grotesk", weight: 600, tracking: "-.02em", scale: 0.98 },
  { name: "Manrope", weight: 700, tracking: "-.02em", scale: 1 },
  { name: "Fredoka", weight: 600, tracking: "0em", scale: 1.02 },
  { name: "Nunito", weight: 700, tracking: "-.01em", scale: 1 },
  { name: "Lexend", weight: 600, tracking: "-.02em", scale: 0.96 },
  { name: "Urbanist", weight: 700, tracking: "-.01em", scale: 1.04 },
  { name: "Figtree", weight: 700, tracking: "-.02em", scale: 1 },
];

export const fontOf = (name: string) => FONTS.find((f) => f.name === name) ?? FONTS[0];
export const fontStack = (name: string) => `'${name}', Inter, system-ui, sans-serif`;

export const MAX_BY_ROLE = { title: 50, sub: 60, body: 160 };

/* ---- Dates (spec §7.4) ---------------------------------------------- */

const pad2 = (n: number) => String(n).padStart(2, "0");

// Local calendar day as YYYY-MM-DD — the screen's own clock and time zone.
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Built from its parts so it is LOCAL midnight — `new Date("2026-11-14")`
// would be read as UTC and land on the previous evening in the US.
function parseDate(s: string): Date | null {
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function dayDiff(eventDate: string, today: string): number | null {
  const d = parseDate(eventDate);
  const t = parseDate(today);
  if (!d || !t) return null;
  return Math.round((d.getTime() - t.getTime()) / 864e5);
}

const fmtDate = (s: string) =>
  (parseDate(s) as Date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const weekday = (s: string) => (parseDate(s) as Date).toLocaleDateString("en-US", { weekday: "long" });

// Badge text, derived from the event date every render (never stored).
export function autoBadge(type: EventCardType, eventDate: string, today: string): string {
  const n = dayDiff(eventDate, today);
  if (n == null) return TYPES[type].fallbackBadge;
  const dt = fmtDate(eventDate);
  if (type === "welcome") {
    if (n === 0) return "Starts today";
    if (n === 1) return "Starts tomorrow";
    if (n > 1 && n < 7) return "Starts " + weekday(eventDate);
    if (n >= 7) return "Starts " + dt;
    if (n > -7) return "Joined this week";
    return "Joined " + dt;
  }
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n > 1 && n < 7) return "In " + n + " days";
  if (n >= 7) return dt;
  if (n === -1) return "Yesterday";
  if (n > -7) return -n + " days ago";
  return dt;
}

/* ---- Particles ------------------------------------------------------- */

// Deterministic pseudo-random 0..1, so particles land in the same place on
// every render (spec §8 B).
export const rnd = (i: number, k: number) => {
  const x = Math.sin((i + 1) * k) * 10000;
  return x - Math.floor(x);
};

// Library images are big camera originals; the photo circle only needs a
// resized copy (Cloudinary URL transform, same idea as DFM's ContentTile).
export function sizedImage(url: string): string {
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/w_900,c_limit,q_auto,f_auto/") : url;
}
