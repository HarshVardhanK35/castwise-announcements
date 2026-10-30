// Mirrors device-fleet-manager's apps/appModals/announcements/
// rotatingNoticesConfig.js form shape exactly — this is what arrives as
// `config` over the DFM_CONFIG postMessage.
export type Tier = "Urgent" | "Warning" | "Info";

export interface Board {
  id: string;
  tierWithTwo: "None" | Tier;
  urgent: string[];
  warning: string[];
  info: string[];
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
}

// One rendered card, in final stack order (Urgent -> Warning -> Info, each
// tier's own 2nd/"peer" message immediately after its 1st).
export interface NoticeCard {
  tier: "urgent" | "warning" | "info";
  text: string;
  peer: boolean;
}

export function cardsForBoard(board: Board): NoticeCard[] {
  const cards: NoticeCard[] = [];
  (["urgent", "warning", "info"] as const).forEach((tier) => {
    board[tier].forEach((text, i) => {
      if (text) cards.push({ tier, text, peer: i > 0 });
    });
  });
  return cards;
}
