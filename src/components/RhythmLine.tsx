// The signature visual: a "rhythm line".
//
// Instead of a red/amber/green risk gauge, we draw the person's serving cadence
// as a breathing wave — the acute (recent) load as a filled ribbon over the
// chronic (baseline) load as a quiet underline. When the ribbon lifts clearly
// above the baseline, that's a spike, shown as gentle terracotta rather than a
// klaxon. It reads as a heartbeat, not a threat level.

import type { WeeklyLoadPoint } from "@/lib/rhythm/types";

interface Props {
  series: WeeklyLoadPoint[];
  color?: string;
  height?: number;
  width?: number;
  showBaseline?: boolean;
  /** animate the stroke drawing in on mount */
  animate?: boolean;
}

/** Catmull-Rom → cubic bezier for a smooth, organic line through the points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function RhythmLine({
  series,
  color = "var(--color-terracotta)",
  height = 64,
  width = 240,
  showBaseline = true,
  animate = false,
}: Props) {
  if (series.length === 0) return null;

  const pad = 4;
  const w = width;
  const h = height;
  const maxVal = Math.max(
    0.5,
    ...series.map((p) => Math.max(p.acute, p.chronic, p.rawLoad)),
  );
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / maxVal) * (h - pad * 2);

  const acutePts = series.map((p, i) => [x(i), y(p.acute)] as [number, number]);
  const chronicPts = series.map((p, i) => [x(i), y(p.chronic)] as [number, number]);

  const acuteLine = smoothPath(acutePts);
  const chronicLine = smoothPath(chronicPts);
  const area = `${acuteLine} L ${x(series.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  const uid = `${Math.round(width)}-${Math.round(maxVal * 100)}-${series.length}`;
  const gid = `rl-fill-${uid}`;
  const glowId = `rl-glow-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="overflow-visible"
      role="img"
      aria-label="Serving load rhythm over recent weeks"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={area} fill={`url(#${gid})`} />

      {showBaseline && (
        <path
          d={chronicLine}
          fill="none"
          stroke="var(--color-cream-faint)"
          strokeWidth={1.25}
          strokeDasharray="2 4"
          opacity={0.5}
        />
      )}

      <path
        d={acuteLine}
        fill="none"
        stroke={color}
        filter={`url(#${glowId})`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          animate
            ? {
                strokeDasharray: 1000,
                strokeDashoffset: 1000,
                animation: "draw 1.4s cubic-bezier(0.22,1,0.36,1) forwards",
              }
            : undefined
        }
      />

      {/* the "now" dot — the current beat */}
      <circle
        cx={acutePts[acutePts.length - 1][0]}
        cy={acutePts[acutePts.length - 1][1]}
        r={3.5}
        fill={color}
      />
      <circle
        cx={acutePts[acutePts.length - 1][0]}
        cy={acutePts[acutePts.length - 1][1]}
        r={3.5}
        fill="none"
        stroke={color}
        strokeOpacity={0.4}
      >
        <animate attributeName="r" from="3.5" to="9" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
