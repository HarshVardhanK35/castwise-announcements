// Mirrors device-fleet-manager's apps/appModals/announcements/
// rotatingNoticesConfig.js form shape exactly — this is what arrives as
// `config` over the DFM_CONFIG postMessage.

export interface Board {
  id: string;
  // Editor-only label so the user can tell boards apart — never rendered.
  name?: string;
  urgent: string;
  warning: string;
  info: string;
  // Seconds — how long this board displays during its rotation turn.
  duration: number;
}

export interface RotatingNoticesAppConfig {
  template: "rotating-notices";
  // Not wired yet — DFM's own Theme field is still a disabled
  // "Coming soon" toggle everywhere (see ComingSoonToggle.jsx), always
  // "dark" in practice. Kept here so config round-trips cleanly once a
  // real app-wide theme toggle exists.
  theme: "dark" | "light";
  font: string;
  boards: Board[];
  staggeredEntrance: boolean;
  urgentGlowPulse: boolean;
  // Fixed to "10 min" in DFM's own UI today (no user control) — kept as a
  // real field for when the NEW-tag feature itself gets built (see
  // RotatingNoticesWidget.vue's own comment on why it's not rendered yet).
  newTagDuration: "Off" | "10 min" | "15 min";
  urgentRealertInterval: "Off" | "10 s" | "30 s" | "1 min" | "2 min";
  criticalMode: boolean;
  reduceMotion: boolean;
  audio: string;
  // Editor-only: true while DFM's settings preview is showing this — lets an
  // empty template explain itself instead of showing a blank screen.
  editorPreview?: boolean;
  // Editor-only (never saved, never present at real playback): the board the
  // Manage boards modal is typing/editing — the preview pins to it instead of
  // rotating.
  editorDraft?: {
    mode: "draft" | "editing";
    id?: string;
    urgent: string;
    warning: string;
    info: string;
    duration: number;
  } | null;
}

export type StatusKey = "in" | "low" | "out";

// Mirrors device-fleet-manager's apps/appModals/announcements/status-list/
// statusListConfig.js form shape exactly.
export interface StatusListItem {
  id: string;
  name: string;
  status: StatusKey;
  // 0-90; ignored for "out".
  discount: number;
}

export interface StatusListAppConfig {
  template: "status-list";
  theme: "dark" | "light";
  font: string;
  title: string;
  layout: "List" | "Grid";
  // Kitchen = inventory for staff (no discounts); customers = menu board.
  purpose: "kitchen" | "customers";
  dimOutOfStock: boolean;
  priority: "Off" | "Deals first" | "Out first" | "Low first";
  items: StatusListItem[];
  rowFlash: boolean;
  outOfStockPulse: boolean;
  bigDealShimmer: boolean;
  banner: boolean;
  bannerText: string;
  audio: string;
  // Editor-only (never saved, never present at real playback): what the
  // Manage products modal is currently typing/editing, so the preview can
  // show a draft row or highlight the edited one.
  editorDraft?: {
    mode: "draft" | "editing";
    id?: string;
    name: string;
    status: StatusKey;
    discount: number;
  } | null;
}

export type EventCardType = "birthday" | "milestone" | "welcome" | "congrats" | "holiday";

// Mirrors device-fleet-manager's apps/appModals/announcements/event-cards/
// eventCardsConfig.js: every card stores the same three text fields, and the
// type decides what they mean (title = name / milestone title / occasion,
// sub = role / achievement, message = wish / description / note).
export interface EventCardData {
  id: string;
  type: EventCardType;
  title: string;
  sub: string;
  message: string;
  // YYYY-MM-DD or "" — optional, may be in the future.
  eventDate: string;
  font: string;
  showImage: boolean;
  image: { url: string; name: string; contentId?: string } | null;
  // Seconds on screen.
  duration: number;
  // Background audio file name from the content library, or "None".
  audio: string;
}

export interface EventCardsEffects {
  glow: boolean;
  particles: boolean;
  iconMotion: boolean;
  countUp: boolean;
  welcomePop: boolean;
  congratsFx: boolean;
  holidayFx: boolean;
  bigHead: boolean;
  gradHead: boolean;
  badge: boolean;
}

export interface EventCardsAppConfig {
  template: "event-cards";
  theme: "dark" | "light";
  cards: EventCardData[];
  effects: EventCardsEffects;
  reduceMotion: boolean;
  editorPreview?: boolean;
  // Editor-only (never saved, never present at real playback): the card the
  // Manage cards modal is typing/editing — the preview pins to it instead of
  // rotating.
  editorDraft?: (Omit<EventCardData, "id"> & { mode: "draft" | "editing"; id?: string }) | null;
}

// What arrives over DFM_CONFIG — the template field picks the widget.
export type AnnouncementsAppConfig =
  | RotatingNoticesAppConfig
  | StatusListAppConfig
  | EventCardsAppConfig;

// One rendered card, in final stack order (Urgent -> Warning -> Info).
export interface NoticeCard {
  tier: "urgent" | "warning" | "info";
  text: string;
}

export function cardsForBoard(board: Board): NoticeCard[] {
  const cards: NoticeCard[] = [];
  (["urgent", "warning", "info"] as const).forEach((tier) => {
    const text = board[tier].trim();
    if (text) cards.push({ tier, text });
  });
  return cards;
}
