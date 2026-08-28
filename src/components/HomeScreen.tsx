"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { DotCalendar } from "./DotCalendar";
import { STATUS_META, statusLabel } from "@/lib/rhythm/status";
import type { Status, FlagDriver } from "@/lib/rhythm/assess";

export interface Story {
  id: string;
  name: string;
  initials: string;
  team: string;
  status: Status;
  driver: FlagDriver;
  reason: string;
  streakWeeks: number;
  servicesThisWeek: number;
  weeklyCounts: number[];
}
export interface TeamCard {
  team: string;
  campus: string;
  emoji: string;
  count: number;
  flagged: number;
  status: Status;
}

export function HomeScreen({
  stories,
  teams,
  totals,
  followUp,
}: {
  stories: Story[];
  teams: TeamCard[];
  totals: { elevated: number; watch: number; steady: number; active: number };
  followUp: { id: string; name: string; initials: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(stories[0]?.id ?? null);
  const active = stories.find((s) => s.id === selected) ?? stories[0] ?? null;
  const campusGroups = groupByCampus(teams);

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
              carrying a heavy load right now
              {totals.watch > 0 && (
                <>
                  , and <span className="font-display font-bold text-amber">{totals.watch} more</span> {totals.watch === 1 ? "is" : "are"} worth a quiet word
                </>
              )}
              .{" "}
              <span className="text-mute">{totals.steady} others are in a healthy rhythm.</span>
            </>
          ) : (
            <>
              Everyone&apos;s in a good rhythm.{" "}
              <span className="text-mute">All {totals.active} serving volunteers are steady this week.</span>
            </>
          )}
        </p>
      </section>

      {/* Care loop — flagged people who still need a check-in, so nobody slips
          through. Turns green once every flag has follow-up logged. */}
      {followUp.length > 0 ? (
        <section
          className="rise overflow-hidden rounded-[var(--radius-card)] p-5"
          style={{ animationDelay: "40ms", background: "linear-gradient(135deg, rgba(255,180,84,0.14), rgba(255,92,138,0.10))", border: "1px solid rgba(255,180,84,0.3)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber">Needs a check-in</p>
          <p className="mt-1 text-[15px] font-medium text-text text-balance">
            <span className="font-display font-bold">{followUp.length}</span> flagged {followUp.length === 1 ? "volunteer hasn’t" : "volunteers haven’t"} been followed up yet.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {followUp.slice(0, 6).map((p) => (
              <Link key={p.id} href={`/journey/${p.id}`} className="flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1 pl-1 pr-3 transition-transform active:scale-95">
                <span className="flex h-6 w-6 items-center justify-center rounded-full grad-brand font-display text-[9px] font-bold text-white">{p.initials}</span>
                <span className="text-xs font-semibold text-text">{p.name.split(" ")[0]}</span>
              </Link>
            ))}
            {followUp.length > 6 && <span className="self-center text-xs text-mute">+{followUp.length - 6} more</span>}
          </div>
        </section>
      ) : stories.length > 0 ? (
        <section className="rise" style={{ animationDelay: "40ms" }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-mute">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full grad-mint text-xs font-bold text-[#04231a]">✓</span>
            Every flagged volunteer has a check-in logged.
          </div>
        </section>
      ) : null}

      {/* Desktop: flagged people + expanded profile in the left column, teams in
          the right. Grid is lg-only, so the phone layout stacks exactly as before. */}
      <div className="space-y-8 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        <div className="space-y-8 lg:col-span-7">
      {/* Stories row */}
      {stories.length > 0 && (
        <section className="rise" style={{ animationDelay: "90ms" }}>
          <h2 className="mb-3.5 text-sm font-medium text-mute">Flagged this week</h2>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:gap-5 lg:overflow-visible lg:px-0">
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
                {statusLabel(active.status, active.driver)}
              </span>
            </div>

            <p className="relative mt-5 text-[17px] font-medium leading-relaxed text-text text-balance">{active.reason}.</p>

            <div className="relative mt-5">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Serving rhythm · 26 weeks</p>
              <DotCalendar counts={active.weeklyCounts} size={10} legend />
            </div>

            <Link href={`/journey/${active.id}`} className="relative mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full grad-brand py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(139,108,255,0.9)]">
              Open pastoral profile →
            </Link>
          </motion.section>
        </AnimatePresence>
      )}
        </div>

      {/* Team cards — grouped by campus so campuses never blend. */}
      {teams.length > 0 && (
        <section className="rise lg:col-span-5" style={{ animationDelay: "150ms" }}>
          <h2 className="mb-3.5 text-sm font-medium text-mute">Teams</h2>
          <div className="space-y-5">
            {campusGroups.map(({ campus, cards, serving, flagged }, ci) => (
              <div key={campus}>
                {campusGroups.length > 1 && (
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{campus}</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="shrink-0 text-[11px] text-mute">{serving} serving{flagged > 0 ? ` · ${flagged} flagged` : ""}</span>
                  </div>
                )}
                <div className="no-scrollbar -mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-3.5 lg:overflow-visible lg:px-0" style={{ animationDelay: `${ci * 40}ms` }}>
                  {cards.map((t) => {
                    const meta = STATUS_META[t.status];
                    return (
                      <Link
                        key={t.team}
                        href={`/teams/${encodeURIComponent(t.team)}`}
                        className="glass-edge relative w-44 shrink-0 overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.97] lg:w-auto"
                      >
                        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.ring }} />
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: meta.soft }}>{t.emoji}</div>
                        <p className="mt-3 truncate font-display text-sm font-bold text-text" title={t.team}>{t.team}</p>
                        <p className="mt-0.5 text-xs text-mute">{t.count} serving</p>
                        <span className="mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: meta.color, background: meta.soft }}>
                          {t.flagged > 0 ? `${t.flagged} to check in on` : "All healthy"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>

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

const CAMPUS_ORDER = ["North Shore", "Dunedin", "Other"];

/** Bucket team cards by campus (campus already resolved server-side), ordered
 *  NS → Dunedin → Other so campuses stay visually separate and never blend. */
function groupByCampus(teams: TeamCard[]) {
  const map = new Map<string, TeamCard[]>();
  for (const t of teams) {
    const arr = map.get(t.campus) ?? [];
    arr.push(t);
    map.set(t.campus, arr);
  }
  return [...map.entries()]
    .map(([campus, cards]) => ({
      campus,
      cards,
      serving: cards.reduce((n, c) => n + c.count, 0),
      flagged: cards.reduce((n, c) => n + c.flagged, 0),
    }))
    .sort((a, b) => {
      const ai = CAMPUS_ORDER.indexOf(a.campus), bi = CAMPUS_ORDER.indexOf(b.campus);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}
