// Team load trend: median ACWR across everyone, last 12 weeks, with the 1.3×
// spike threshold drawn in. Shows whether the whole team is drifting into
// overload — a pattern no individual card reveals.

interface Props {
  trend: { weekStart: string; median: number | null }[];
  width?: number;
  height?: number;
}

export function TeamTrend({ trend, width = 520, height = 150 }: Props) {
  const pts = trend.filter((t) => t.median != null) as { weekStart: string; median: number }[];
  if (pts.length < 2) return null;

  const pad = { l: 30, r: 12, t: 14, b: 20 };
  const vals = pts.map((p) => p.median);
  const max = Math.max(1.5, ...vals);
  const min = Math.min(0.8, ...vals);
  const x = (i: number) => pad.l + (i / (pts.length - 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + ((max - v) / (max - min)) * (height - pad.t - pad.b);

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.median)}`).join(" ");
  const area = `${line} L ${x(pts.length - 1)} ${height - pad.b} L ${x(0)} ${height - pad.b} Z`;
  const thresholdY = y(1.3);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Team load trend">
      <defs>
        <linearGradient id="tt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* threshold */}
      <line x1={pad.l} y1={thresholdY} x2={width - pad.r} y2={thresholdY} stroke="var(--color-ember)" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
      <text x={width - pad.r} y={thresholdY - 4} textAnchor="end" fontSize="10" className="fill-[var(--color-ember)]">
        1.3× spike line
      </text>

      <path d={area} fill="url(#tt-fill)" />
      <path d={line} fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 5px var(--color-gold))" }} />
      <circle cx={x(pts.length - 1)} cy={y(vals[vals.length - 1])} r="4" fill="var(--color-gold)" />

      {/* y ticks */}
      {[1.0, 1.3].map((v) => (
        <text key={v} x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" className="fill-[var(--color-cream-faint)]">
          {v.toFixed(1)}
        </text>
      ))}
    </svg>
  );
}
