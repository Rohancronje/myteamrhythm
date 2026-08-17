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
    <div className="space-y-8">
      {/* Briefing — the hero. One plain sentence, numbers inline. */}
      <section className="rise glass-edge relative overflow-hidden rounded-[var(--radius-card)] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple/25 blur-3xl" />
        <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">This week · at a glance</p>
        <p className="relative text-[22px] font-medium leading-[1.35] tracking-tight text-text text-balance">
          {totals.elevated > 0 ? (
            <>
              <span className="font-display font-bold grad-text">{totals.elevated} {totals.elevated === 1 ? "person is" : "people are"}</span>{" "}
              serving heavy right now
              {totals.watch > 0 && (
                <>
                  , and <span className="font-display font-bold text-amber">{totals.watch} more</span> {totals.watch === 1 ? "is" : "are"} worth a quiet word
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
        <section className="rise" style={{ animationDelay: "90ms" }}>
          <h2 className="mb-3.5 text-sm font-medium text-mute">Worth a check-in</h2>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1">
            {stories.map((s) => {
              const meta = STATUS_META[s.status];
              const isSel = s.id === active?.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  whileTap={{ scale: 0.9 }}
                  className="flex w-16 shrink-0 flex-col items-center gap-2"
                >
                  <span
                    className="relative flex h-16 w-16 items-center justify-center rounded-full p-[2.5px] transition-all duration-300"
                    style={{
                      background: meta.ring,
                      transform: isSel ? "scale(1.08)" : "scale(1)",
                      boxShadow: isSel ? `0 0 22px -2px ${meta.color}` : "none",
                      animation: isSel ? "float 3.2s ease-in-out infinite" : "none",
                    }}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-sm font-bold text-text">
                      {s.initials}
                    </span>
                    {s.streakWeeks >= 6 && (
                      <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full grad-amber px-1.5 py-0.5 text-[10px] font-bold text-[#2a1200] shadow-lg">
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="glass-edge relative overflow-hidden rounded-[var(--radius-card)] p-6"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full opacity-30 blur-3xl"
              style={{ background: STATUS_META[active.status].color }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full p-[2.5px]" style={{ background: STATUS_META[active.status].ring, boxShadow: `0 0 20px -4px ${STATUS_META[active.status].color}` }}>
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-base font-bold">{active.initials}</span>
                </span>
                <div>
                  <p className="font-display text-xl font-bold text-text">{active.name}</p>
                  <p className="text-xs text-mute">{active.team}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: STATUS_META[active.status].color, background: STATUS_META[active.status].soft }}>
                {STATUS_META[active.status].label}
              </span>
            </div>

            <p className="relative mt-5 text-[17px] font-medium leading-relaxed text-text text-balance">{active.reason}.</p>

            <div className="relative mt-5">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Serving rhythm · 26 weeks</p>
              <DotCalendar weeks={active.weeklyDots} color={STATUS_META[active.status].color} size={10} />
            </div>

            <Link href={`/journey/${active.id}`} className="relative mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full grad-brand py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(139,108,255,0.9)]">
              Open pastoral profile →
            </Link>
          </motion.section>
        </AnimatePresence>
      )}

      {/* Team cards */}
      {teams.length > 0 && (
        <section className="rise" style={{ animationDelay: "150ms" }}>
          <h2 className="mb-3.5 text-sm font-medium text-mute">Teams</h2>
          <div className="no-scrollbar -mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1">
            {teams.map((t) => {
              const meta = STATUS_META[t.status];
              return (
                <Link
                  key={t.team}
                  href={`/teams/${encodeURIComponent(t.team)}`}
                  className="glass-edge relative w-44 shrink-0 overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97]"
                >
                  <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.ring }} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: meta.soft }}>{t.emoji}</div>
                  <p className="mt-3 truncate font-display text-sm font-bold text-text" title={t.team}>{t.team}</p>
                  <p className="mt-0.5 text-xs text-mute">{t.count} serving</p>
                  <span className="mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: meta.color, background: meta.soft }}>
                    {t.flagged > 0 ? `${t.flagged} to check` : "All steady"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Collapsed good news */}
      <section className="rise" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-mute">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full grad-mint text-sm font-bold text-[#04231a]">✓</span>
          <span className="font-display font-bold text-text">{totals.steady}</span> others are serving in a healthy rhythm.
        </div>
      </section>
    </div>
  );
}
