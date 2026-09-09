// Plain-language status presentation (handover section 5: Steady / Watch /
// Elevated only — no ratios, no chart jargon).

import type { Status, FlagDriver } from "./assess";

export const STATUS_META: Record<
  Status,
  { label: string; color: string; ring: string; soft: string }
> = {
  steady: {
    label: "Healthy",
    color: "var(--color-mint)",
    ring: "linear-gradient(135deg, #34d399 0%, #5cc2ff 100%)",
    soft: "color-mix(in srgb, var(--color-mint) 16%, transparent)",
  },
  watch: {
    label: "Watch",
    color: "var(--color-amber)",
    ring: "linear-gradient(135deg, #ffb454 0%, #ff5c8a 100%)",
    soft: "color-mix(in srgb, var(--color-amber) 18%, transparent)",
  },
  elevated: {
    label: "Heavy load",
    color: "var(--color-danger)",
    ring: "linear-gradient(135deg, #f4425c 0%, #ff8a5c 100%)",
    soft: "color-mix(in srgb, var(--color-danger) 18%, transparent)",
  },
};

/**
 * The badge text for a person. Severity sets the colour (STATUS_META); the driver
 * sharpens the word so an endurance flag reads "No break", not "Heavy load".
 */
export function statusLabel(status: Status, driver: FlagDriver): string {
  if (status === "steady") return "Healthy";
  if (status === "elevated") return driver === "endurance" ? "No break" : "Heavy load";
  return driver === "endurance" ? "No break yet" : "Watch";
}
