// The dot-calendar rhythm graph (handover section 2) — a person's serving history
// as one dot per week. Deliberately NOT a chart: no axis, no line, no trend. But
// each dot is now coloured by that week's load so a heavy week reads differently
// from a healthy one: hollow = a break, green = healthy (1–2), red = heavy (3+).

const HEALTHY = "var(--color-mint)";
const HEAVY = "var(--color-danger)";

function loadColor(count: number): string | null {
  if (count <= 0) return null; // break — hollow
  return count >= 3 ? HEAVY : HEALTHY;
}

export function DotCalendar({
  counts,
  size = 9,
  legend = false,
}: {
  counts: number[];
  size?: number;
  legend?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {counts.map((count, i) => {
          const color = loadColor(count);
          return (
            <span
              key={i}
              title={count <= 0 ? "Break" : `${count} ${count === 1 ? "service" : "services"} that week`}
              className="rounded-full"
              style={{
                width: size,
                height: size,
                background: color ?? "transparent",
                border: color ? "none" : "1.5px solid var(--color-border-strong)",
              }}
            />
          );
        })}
      </div>
      {legend && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: HEALTHY }} />healthy (1–2)</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: HEAVY }} />heavy (3+)</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full border border-border-strong" />a break</span>
        </div>
      )}
    </div>
  );
}
