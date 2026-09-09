# Rhythm — Design System ("Aurora Nocturne")

A dark, glassy aesthetic: near-black base, a living aurora mesh, purple→pink brand,
mint/amber/blue status accents, Space Grotesk headings + Inter body. Tokens live in
`src/app/globals.css` under `@theme` (Tailwind v4 CSS-variable tokens).

## Colour tokens

| Token | Value | Use | Contrast on `surface` |
|---|---|---|---|
| `bg` | `#08070f` | app background | — |
| `surface` | `#1c1b29` | **form-field fill** (opaque, no aurora bleed) | — |
| `surface-solid` | `#14131e` | solid chips/tiles | — |
| `surface-2` | `#23212f` | nested fills (comments, notes) | — |
| `border` | `rgba(255,255,255,.14)` | field/card edges | 3:1 (UI) ✓ |
| `text` | `#f7f6fc` | primary text | 15.8:1 ✓ |
| `mute` | `#b4b1c6` | secondary text / labels | 8.1:1 ✓ |
| `faint` | `#9794b0` | hints / placeholders | 5.8:1 ✓ |
| `purple` | `#8b6cff` | brand, emphasis, icons | 4.6:1 (see note) |
| `pink` | `#ff5c8a` | brand accent | 5.8:1 ✓ |
| `mint` | `#38dd9b` | positive/done | 9.7:1 ✓ |
| `amber` | `#ffb454` | attention / pastor role | 9.6:1 ✓ |
| `blue` | `#5cc2ff` | info / links / leader role | 8.6:1 ✓ |
| `danger` | `#f4425c` | destructive | 4.7:1 (see note) |

**All body/secondary text passes WCAG AA (4.5:1).**

### Colour usage rules
- **`purple` and `danger` are ~4.6:1** — fine for **large/bold text, icons, borders, and
  emphasis**, but for **small body copy** prefer `text` / `mute`. Buttons put them behind
  white text on a gradient (`grad-brand`), which is compliant.
- Status colours (`mint`/`amber`/`blue`) are high-contrast — safe for small text too.
- Never put text on the raw aurora — always on `surface*` or a `.glass` card.

## Type scale
- Display: `--font-space` (Space Grotesk) via `.font-display` — headings, numbers.
- Body: `--font-inter` (Inter) — everything else.
- Sizes in use: `text-[10px]`/`text-[11px]` (labels), `text-xs` (meta), `text-sm` (body),
  `text-base`/`text-lg` (titles), `font-display text-2xl/3xl/4xl` (hero numbers).

## Spacing & radius
- Spacing follows Tailwind's 4px scale (`gap-2`/`gap-3`, `p-4`/`p-5`/`p-6`).
- `--radius-card: 22px` for cards; `rounded-2xl` (16px) for tiles; `rounded-full` for
  pills/inputs-as-pills and buttons.

## Surfaces
- `.glass` / `.glass-edge` — frosted cards with a gradient hairline border + top sheen.
  `.glass-edge` (hero/detail) adds a brand glow. Use for cards over the aurora.
- Opaque fills (`bg-surface`, `bg-surface-solid`, `bg-surface-2`) for form fields and
  chips so text stays readable regardless of the aurora behind.

## Components (conventions)

| Component | Pattern |
|---|---|
| **Primary button** | `rounded-full grad-brand py-3 text-sm font-bold text-white` |
| **Secondary button** | `rounded-full border border-border …text-text` |
| **Input / select / textarea** | `rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none` |
| **Pill toggle** | `rounded-full border px-3 py-1.5 text-xs font-semibold` (active: brand bg + white) |
| **Card** | `.glass rounded-[var(--radius-card)] p-5` |

### Accessibility
- **Tap targets:** interactive controls aim for a **≥44px** touch area (min 24px for AA).
  Small inline actions ("Remove", "Edit", "Clear") use `py-2`+ / `min-h` to stay tappable.
- **Focus:** global `:focus-visible` purple ring (keyboard users only).
- **Motion:** honours `prefers-reduced-motion`.
- **Contrast:** all text combinations verified ≥4.5:1 (see table).

## Adding new UI
1. Reuse the tokens above — no hard-coded hex.
2. Text: `text` → `mute` → `faint` for hierarchy (all AA-safe).
3. Fields on `bg-surface`; cards on `.glass`.
4. Keep tap targets comfortable; put destructive actions in `danger` but not tiny.
