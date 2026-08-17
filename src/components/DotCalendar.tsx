// The dot-calendar rhythm graph (handover section 2) — a person's serving history
// as one dot per week, filled = served, hollow = a break. Deliberately NOT a
// chart: no axis, no line, no trend. Presence/absence, human-readable at a glance.

export function DotCalendar({
  weeks,
  color = "var(--color-mint)",
  size = 9,
}: {
  weeks: boolean[];
  color?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {weeks.map((served, i) => (
        <span
          key={i}
          title={served ? "Served" : "Break"}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: served ? color : "transparent",
            border: served ? "none" : "1.5px solid var(--color-border-strong)",
          }}
        />
      ))}
    </div>
  );
}
