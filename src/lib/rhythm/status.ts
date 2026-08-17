// Plain-language status presentation (handover section 5: Steady / Watch /
// Elevated only — no ratios, no chart jargon).

import type { Status } from "./assess";

export const STATUS_META: Record<
  Status,
  { label: string; color: string; ring: string; soft: string }
> = {
  steady: {
    label: "Steady",
    color: "var(--color-mint)",
    ring: "linear-gradient(135deg, #38dd9b 0%, #5cc2ff 100%)",
    soft: "color-mix(in srgb, var(--color-mint) 16%, transparent)",
  },
  watch: {
    label: "Watch",
    color: "var(--color-amber)",
    ring: "linear-gradient(135deg, #ffb454 0%, #ff5c8a 100%)",
    soft: "color-mix(in srgb, var(--color-amber) 18%, transparent)",
  },
  elevated: {
    label: "Elevated",
    color: "var(--color-pink)",
    ring: "linear-gradient(135deg, #ff5c8a 0%, #8b6cff 100%)",
    soft: "color-mix(in srgb, var(--color-pink) 18%, transparent)",
  },
};
