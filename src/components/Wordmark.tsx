// Rhythm wordmark — Space Grotesk with a gradient pulse mark.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-display text-xl font-bold tracking-tight text-text">Rhythm</span>
      <svg width="24" height="13" viewBox="0 0 30 16" aria-hidden>
        <defs>
          <linearGradient id="wm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b6cff" />
            <stop offset="100%" stopColor="#ff5c8a" />
          </linearGradient>
        </defs>
        <path
          d="M0 8 H5 L7 2.5 L10.5 13.5 L14 4 L17 10 H30"
          fill="none"
          stroke="url(#wm)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
