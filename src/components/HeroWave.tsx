// A wide, slow, glowing rhythm wave used as ambient hero art. Purely decorative —
// it sets the tone (this is a living, breathing thing) before any data appears.

export function HeroWave() {
  return (
    <svg
      viewBox="0 0 1200 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-40 w-full opacity-70"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.1" />
          <stop offset="35%" stopColor="var(--color-gold)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="var(--color-ember)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-clay)" stopOpacity="0.15" />
        </linearGradient>
        <filter id="hero-glow" x="-5%" y="-60%" width="110%" height="240%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0 96 C 90 96, 120 96, 150 96 S 200 40, 235 96 C 260 132, 285 96, 320 96 S 380 20, 430 96 C 470 150, 520 60, 575 96 S 660 8, 720 96 C 760 150, 820 70, 880 96 S 980 110, 1060 84 C 1120 66, 1160 96, 1200 96"
        fill="none"
        stroke="url(#hero-stroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#hero-glow)"
        style={{
          strokeDasharray: 2600,
          strokeDashoffset: 2600,
          animation: "draw 2.6s cubic-bezier(0.22,1,0.36,1) 0.2s forwards",
        }}
      />
    </svg>
  );
}
