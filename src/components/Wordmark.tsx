// Rhythm wordmark — a serif logotype with a living, glowing pulse for the "i".

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2.5 ${className}`}>
      <span className="font-display text-3xl font-semibold tracking-tight text-cream">
        Rhythm
      </span>
      <svg width="30" height="16" viewBox="0 0 30 16" aria-hidden className="translate-y-[1px]">
        <defs>
          <filter id="wm-glow" x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M0 8 H5 L7 2.5 L10.5 13.5 L14 4 L17 10 H30"
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#wm-glow)"
        />
      </svg>
    </span>
  );
}
