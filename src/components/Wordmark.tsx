// Rhythm wordmark — a clean serif logotype with a small pulse mark.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-2xl font-semibold tracking-tight text-ink">
        Rhythm
      </span>
      <svg width="26" height="14" viewBox="0 0 30 16" aria-hidden className="translate-y-[1px]">
        <path
          d="M0 8 H5 L7 2.5 L10.5 13.5 L14 4 L17 10 H30"
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
