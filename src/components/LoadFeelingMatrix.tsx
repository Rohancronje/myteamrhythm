"use client";

// The signature insight: every serving member plotted on load (x) against feeling
// (y). The whole thesis in one picture — load alone or feeling alone mislead, but
// the bottom-right corner (serving hard, running low) is where burnout actually
// lives. Dots there glow; everything else recedes. Hover for the handle.

import { useState } from "react";
import { ATTENTION_META } from "@/lib/rhythm/presentation";
import type { MatrixPoint } from "@/lib/rhythm/insights";

const W = 520;
const H = 360;
const PAD = { l: 44, r: 20, t: 20, b: 40 };

// load axis 0.5 → 1.9, feeling axis 5 (top) → 1 (bottom)
const LOAD_MIN = 0.5;
const LOAD_MAX = 1.9;
const LOAD_LINE = 1.3; // spike threshold
const FEEL_LINE = 3; // low-feeling threshold

export function LoadFeelingMatrix({ points }: { points: MatrixPoint[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const x = (acwr: number) =>
    PAD.l + ((clamp(acwr, LOAD_MIN, LOAD_MAX) - LOAD_MIN) / (LOAD_MAX - LOAD_MIN)) * (W - PAD.l - PAD.r);
  const y = (feel: number) =>
    PAD.t + ((5 - clamp(feel, 1, 5)) / 4) * (H - PAD.t - PAD.b);

  const dangerX = x(LOAD_LINE);
  const dangerY = y(FEEL_LINE);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Load versus feeling matrix">
      <defs>
        <radialGradient id="danger-bloom" cx="100%" cy="100%" r="90%">
          <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* danger corner: high load, low feeling */}
      <rect
        x={dangerX}
        y={dangerY}
        width={W - PAD.r - dangerX}
        height={H - PAD.b - dangerY}
        fill="url(#danger-bloom)"
      />

      {/* quadrant lines */}
      <line x1={dangerX} y1={PAD.t} x2={dangerX} y2={H - PAD.b} stroke="var(--color-line)" strokeDasharray="3 4" />
      <line x1={PAD.l} y1={dangerY} x2={W - PAD.r} y2={dangerY} stroke="var(--color-line)" strokeDasharray="3 4" />

      {/* axis labels */}
      <text x={PAD.l} y={H - 12} className="fill-[var(--color-cream-faint)]" fontSize="11">
        ← lighter load
      </text>
      <text x={W - PAD.r} y={H - 12} textAnchor="end" className="fill-[var(--color-cream-faint)]" fontSize="11">
        heavier load →
      </text>
      <text
        x={16}
        y={PAD.t + 6}
        className="fill-[var(--color-cream-faint)]"
        fontSize="11"
        transform={`rotate(-90 16 ${PAD.t + 6})`}
        textAnchor="start"
      >
        drained → energised
      </text>
      <text
        x={dangerX + 8}
        y={H - PAD.b - 8}
        className="fill-[var(--color-ember)]"
        fontSize="11"
        fontWeight="600"
      >
        burnout corner
      </text>

      {/* points */}
      {points.map((p) => {
        const meta = ATTENTION_META[p.attention];
        const isHot = p.attention === "priority" || p.attention === "check_in";
        const r = hover === p.id ? 9 : isHot ? 7 : 5.5;
        return (
          <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
            {isHot && (
              <circle cx={x(p.acwr)} cy={y(p.feeling)} r={r + 6} fill={meta.color} opacity={0.18} />
            )}
            <circle
              cx={x(p.acwr)}
              cy={y(p.feeling)}
              r={r}
              fill={meta.color}
              stroke="var(--color-night)"
              strokeWidth={1.5}
              style={{ filter: isHot ? `drop-shadow(0 0 6px ${meta.color})` : undefined, cursor: "pointer" }}
            />
            {hover === p.id && (
              <text
                x={x(p.acwr)}
                y={y(p.feeling) - 12}
                textAnchor="middle"
                className="fill-[var(--color-cream)]"
                fontSize="11"
                fontWeight="600"
              >
                {p.handle} · {p.acwr.toFixed(2)}× · {p.feeling.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
