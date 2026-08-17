"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { DotCalendar } from "./DotCalendar";
import { STATUS_META } from "@/lib/rhythm/status";
import type { Status } from "@/lib/rhythm/assess";

export interface Story {
  id: string;
  name: string;
  initials: string;
  team: string;
  status: Status;
  reason: string;
  streakWeeks: number;
  servicesThisWeek: number;
  weeklyDots: boolean[];
}
export interface TeamCard {
  team: string;
  emoji: string;
  count: number;
  flagged: number;
  status: Status;
}

export function HomeScreen({
  stories,
  teams,
  totals,
}: {
  stories: Story[];
  teams: TeamCard[];
  totals: { elevated: number; watch: number; steady: number; active: number };
}) {
  const [selected, setSelected] = useState<string | null>(stories[0]?.id ?? null);
  const active = stories.find((s) => s.id === selected) ?? stories[0] ?? null;

  return (
    <div className="space-y-7">
      {/* Briefing — one plain sentence, numbers inline */}
      <section className="rise glass rounded-[var(--radius-card)] p-5">
        <p className="text-lg leading-relaxed text-text text-balance">
          {totals.elevated > 0 ? (
            <>
              <span className="font-display font-bold grad-text">{totals.elevated} {totals.elevated === 1 ? "person is" : "people are"}</span>{" "}
              serving heavy right now
              {totals.watch > 0 && (
                <>
                  , and{" "}
                  <span className="font-display font-bold text-amber">{totals.watch} more</span>{" "}
                  {totals.watch === 1 ? "is" : "are"} worth a quiet word
                </>
              )}
              .{" "}
              <span className="text-mute">{totals.steady} others are doing just fine.</span>
            </>
          ) : (
            <>
              Everyone&apos;s in a good rhythm.{" "}
              <span className="text-mute">All {totals.active} serving volunteers are steady this week.</span>
            </>
          )}
        </p>
      </section>

      {/* Stories row */}
      {stories.length > 0 && (
        <section className="rise" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 text-sm font-medium text-mute">Worth a check-in</h2>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
            {stories.map((s) => {
              const meta = STATUS_META[s.status];
              const isSel = s.id === active?.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  whileTap={{ scale: 0.92 }}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className="relative flex h-16 w-16 items-center justify-center rounded-full p-[2.5px] transition-transform"
                    style={{ background: meta.ring, opacity: isSel ? 1 : 0.72, transform: isSel ? "scale(1.06)" : "scale(1)" }}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-sm font-semibold text-text">
                      {s.initials}
                    </span>
                    {s.streakWeeks >= 6 && (
                      <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-surface-solid px-1.5 py-0.5 text-[10px] font-bold text-amber ring-1 ring-border">
                        🔥{s.streakWeeks}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[11px]" style={{ color: isSel ? "var(--color-text)" : "var(--color-mute)" }}>{s.name.split(" ")[0]}</span>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Expanding detail card */}
      {active && (
        <AnimatePresence mode="wait">
        <motion.section
          key={active.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-[var(--radius-card)] p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full p-[2px]" style={{ background: STATUS_META[active.status].ring }}>
                <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-sm font-semibold">{active.initials}</span>
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-text">{active.name}</p>
                <p className="text-xs text-mute">{active.team}</p>
              </div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: STATUS_META[active.status].color, background: STATUS_META[active.status].soft }}>
              {STATUS_META[active.status].label}
            </span>
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-text text-balance">{active.reason}.</p>

          <div className="mt-4">
            <p className="mb-2 text-xs text-faint">Serving rhythm · last 26 weeks</p>
            <DotCalendar weeks={active.weeklyDots} color={STATUS_META[active.status].color} />
          </div>

          <Link href={`/journey/${active.id}`} className="mt-5 inline-flex items-center gap-1 text-sm font-medium grad-text">
            Open pastoral profile →
          </Link>
        </motion.section>
        </AnimatePresence>
      )}

      {/* Team cards */}
      {teams.length > 0 && (
        <section className="rise" style={{ animationDelay: "140ms" }}>
          <h2 className="mb-3 text-sm font-medium text-mute">Teams</h2>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {teams.map((t) => {
              const meta = STATUS_META[t.status];
              return (
                <Link
                  key={t.team}
                  href={`/teams/${encodeURIComponent(t.team)}`}
                  className="glass card-tap relative w-44 shrink-0 overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97]"
                >
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: meta.ring }} />
                  <div className="mt-1 text-2xl">{t.emoji}</div>
                  <p className="mt-2 truncate font-display text-sm font-semibold text-text" title={t.team}>{t.team}</p>
                  <p className="mt-0.5 text-xs text-mute">{t.count} serving</p>
                  <span className="mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: meta.color, background: meta.soft }}>
                    {t.flagged > 0 ? `${t.flagged} to check` : "All steady"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Collapsed good news */}
      <section className="rise" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-mute">
          <span className="flex h-8 w-8 items-center justify-center rounded-full grad-mint text-sm">✓</span>
          {totals.steady} others are serving in a healthy rhythm.
        </div>
      </section>
    </div>
  );
}
