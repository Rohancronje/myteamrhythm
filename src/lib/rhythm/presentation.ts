// Presentation metadata — the single source of truth for how rhythm states are
// worded and coloured across the app. Language is deliberately warm and
// non-clinical: this seeds a caring conversation, it is not a verdict.

import type { AttentionLevel } from "./wellbeing";
import type { RhythmZone } from "./types";
import type { RiskLevel } from "./insights";

export const RISK_META: Record<
  RiskLevel,
  { label: string; color: string; bg: string }
> = {
  calm: { label: "Calm", color: "var(--color-calm)", bg: "color-mix(in srgb, var(--color-calm) 12%, white)" },
  watch: { label: "Watch", color: "var(--color-watch)", bg: "color-mix(in srgb, var(--color-watch) 14%, white)" },
  elevated: { label: "Elevated", color: "var(--color-elevated)", bg: "color-mix(in srgb, var(--color-elevated) 14%, white)" },
  high: { label: "High", color: "var(--color-high)", bg: "color-mix(in srgb, var(--color-high) 14%, white)" },
};

export const ZONE_META: Record<
  RhythmZone,
  { label: string; color: string; blurb: string }
> = {
  resting: {
    label: "Resting",
    color: "var(--color-zone-resting)",
    blurb: "Serving below their usual pace — likely on a break.",
  },
  steady: {
    label: "Steady",
    color: "var(--color-zone-steady)",
    blurb: "A sustainable rhythm, close to their own normal.",
  },
  climbing: {
    label: "Climbing",
    color: "var(--color-zone-climbing)",
    blurb: "Serving above baseline. Worth keeping an eye on.",
  },
  spiking: {
    label: "Spiking",
    color: "var(--color-zone-spiking)",
    blurb: "Well above their normal pace — a load spike.",
  },
};

export const ATTENTION_META: Record<
  AttentionLevel,
  { label: string; color: string; note: string; order: number }
> = {
  thriving: {
    label: "Thriving",
    color: "var(--color-zone-steady)",
    note: "In a good rhythm.",
    order: 0,
  },
  watch: {
    label: "Keep an eye",
    color: "var(--color-zone-climbing)",
    note: "One signal is moving. No action needed yet.",
    order: 1,
  },
  check_in: {
    label: "Worth a check-in",
    color: "var(--color-ochre)",
    note: "Load and feeling both worth a gentle conversation.",
    order: 2,
  },
  priority: {
    label: "Reach out soon",
    color: "var(--color-zone-spiking)",
    note: "Rising load confirmed by falling energy — the early-warning pattern.",
    order: 3,
  },
};
