import type { StatusListAppConfig, StatusKey } from "../../announcementsTypes.ts";

// Pure logic ported from SPEC.md / status-list-reference.html (buildData,
// itemFlags, the name-shrink tables, SPOT sizes, screen ratios) — no Vue, no
// DOM, so it can be reasoned about on its own.

export type ItemStatus = StatusKey | "empty";
export type Tier = "small" | "med" | "big";

export interface BoardItem {
  key: string;
  name: string;
  status: ItemStatus;
  tier: Tier | null;
  pct: number;
  // Editor-only cue (SPEC §9): a not-yet-added draft, or the row being edited.
  cue?: "draft" | "editing";
}

// SPEC §3.3: Small 1-15, Medium 16-35, Big 36+.
function tierOf(pct: number): Tier | null {
  if (pct <= 0) return null;
  if (pct <= 15) return "small";
  if (pct <= 35) return "med";
  return "big";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  in: "In Stock",
  low: "Low Stock",
  out: "Out of Stock",
  empty: "Empty slot",
};

// SPEC §5.1 — shape + mark paths (24x24 viewBox).
export const STATUS_ICON: Record<StatusKey, { shape: string; mark: string }> = {
  in: { shape: "M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19Z", mark: "M7.5 12.4l3 3L16.6 9.2" },
  low: { shape: "M12 3L22 20.5H2Z", mark: "M12 9.5v4.6M12 17.4v.1" },
  out: {
    shape: "M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2Z",
    mark: "M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4",
  },
};

// SPEC §2.1 — screen ratios. `lc` list columns (two only with 6+ items),
// `gc` grid columns, `dens` list density (4:3 only).
export interface ScreenShape {
  tall: boolean;
  lc: number;
  gc: number;
  dens: number;
  // Spotlight table prefix: w = 16:9, t = 4:3, v = 9:16.
  spotKind: "w" | "t" | "v";
}

// Same aspect thresholds as the Rotating Notices board's own shape switch,
// so both templates agree on what counts as 16:9 / 4:3 / portrait.
export function shapeFor(width: number, height: number): ScreenShape {
  const aspect = width / height;
  if (aspect >= 1.5) return { tall: false, lc: 2, gc: 5, dens: 1, spotKind: "w" };
  if (aspect >= 1.15) return { tall: false, lc: 1, gc: 4, dens: 0.8, spotKind: "t" };
  return { tall: true, lc: 1, gc: 2, dens: 1, spotKind: "v" };
}

// SPEC §6.3 — [name, tag, status pill] in em of the board base.
const SPOT: Record<string, [number, number, number]> = {
  w1: [4.2, 2.4, 1.1], w2: [2.6, 1.7, 0.9], w3: [1.8, 1.3, 0.8],
  t1: [3.8, 2.2, 1.05], t2: [2, 1.4, 0.82], t3: [1.45, 1.1, 0.72],
  v1: [4.6, 2.6, 1.3], v2: [3.2, 2, 1.1], v3: [2.5, 1.6, 0.95],
};

export function spotSizes(shape: ScreenShape, n: number) {
  const [name, tag, status] = SPOT[`${shape.spotKind}${n}`] ?? [2, 1.4, 0.9];
  return { name: `${name}em`, tag: `${tag}em`, status: `${status}em`, gap: `${n === 1 ? 0.9 : 0.6}em` };
}

// SPEC §4.2 — long names shrink instead of ellipsizing.
export const scaleList = (len: number) => (len <= 16 ? 1 : len <= 22 ? 0.85 : 0.72);
export const scaleGrid = (len: number) => (len <= 12 ? 1 : len <= 16 ? 0.84 : len <= 22 ? 0.74 : 0.6);
export const scaleSpot = (len: number) => (len <= 14 ? 1 : len <= 20 ? 0.82 : 0.66);

// SPEC §2 — base font scale from the visible item count.
export function boardScale(n: number): number {
  return n <= 3 ? 1 : n <= 4 ? 1.35 : n <= 6 ? 1.15 : 1;
}

// DFM's items -> render items. A blank name is an "empty slot" (SPEC §7);
// Out of Stock never carries a discount; priority sorts are stable.
export function buildItems(config: StatusListAppConfig): BoardItem[] {
  const toItem = (
    id: string,
    rawName: string,
    status: StatusKey,
    discount: number,
  ): BoardItem => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) return { key: id, name: "New product", status: "empty", tier: null, pct: 0 };
    const pct = status === "out" ? 0 : Math.max(0, Math.min(90, Math.round(discount || 0)));
    return { key: id, name, status, tier: tierOf(pct), pct };
  };

  const items = config.items.slice(0, 10).map((it) => toItem(it.id, it.name, it.status, it.discount));

  // Editor cues (SPEC §9): the edited product reflects what's typed (keeping
  // its saved name while the field is blank), and a draft appears at the end.
  const draft = config.editorDraft;
  if (draft?.mode === "editing") {
    const i = items.findIndex((x) => x.key === draft.id);
    if (i > -1) {
      items[i] = { ...toItem(draft.id!, draft.name || items[i].name, draft.status, draft.discount), cue: "editing" };
    }
  } else if (draft?.mode === "draft" && draft.name.trim() && items.length < 10) {
    items.push({ ...toItem("draft", draft.name, draft.status, draft.discount), cue: "draft" });
  }

  // SPEC §7: an empty board shows the empty-slot placeholder.
  if (items.length === 0) {
    items.push({ key: "empty", name: "New product", status: "empty", tier: null, pct: 0 });
  }

  const stable = (cmp: (a: BoardItem, b: BoardItem) => number) =>
    items
      .map((d, i) => ({ d, i }))
      .sort((a, b) => cmp(a.d, b.d) || a.i - b.i)
      .map((x) => x.d);

  if (config.priority === "Deals first") {
    return stable((a, b) => (b.tier ? b.pct : -1) - (a.tier ? a.pct : -1));
  }
  if (config.priority === "Out first") {
    const rank: Record<ItemStatus, number> = { out: 0, low: 1, in: 2, empty: 3 };
    return stable((a, b) => rank[a.status] - rank[b.status]);
  }
  if (config.priority === "Low first") {
    const rank: Record<ItemStatus, number> = { low: 0, out: 1, in: 2, empty: 3 };
    return stable((a, b) => rank[a.status] - rank[b.status]);
  }
  return items;
}
