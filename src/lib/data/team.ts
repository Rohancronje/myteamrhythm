// The team data layer. Reads from Postgres when DATABASE_URL is set, otherwise
// from the local snapshot, otherwise an honest empty state. Produces real-name
// assessments for the pastoral view (handover section 3). Async throughout so it
// works against the DB on Vercel where local files aren't available.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assess, type Assessment, type PersonEvent } from "@/lib/rhythm/assess";

interface SnapshotPerson {
  pcoId: string;
  handle: string;
  name: string;
  team: string;
  role: string;
  events: PersonEvent[];
}
interface Snapshot {
  generatedAt: string | null;
  anchor: string;
  windowWeeks: number;
  org: string;
  people: SnapshotPerson[];
}

export interface TeamMember {
  id: string;
  name: string;
  handle: string;
  team: string;
  role: string;
  initials: string;
  assessment: Assessment;
}
export interface TeamInfo {
  source: "planning-center" | "none";
  org: string;
  generatedAt: string | null;
}

let cache: Promise<{ members: TeamMember[]; all: TeamMember[]; info: TeamInfo }> | null = null;

async function loadSnapshot(): Promise<Snapshot | null> {
  if (process.env.DATABASE_URL) {
    const { readRosterSnapshot } = await import("@/db/read");
    const snap = await readRosterSnapshot();
    return snap.people.length ? snap : null;
  }
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-snapshot.json"), "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  return name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

async function build() {
  const snap = await loadSnapshot();
  if (!snap) {
    return { members: [], all: [], info: { source: "none", org: "NS Family Services", generatedAt: null } as TeamInfo };
  }

  const now = new Date(); // real current date (handover rule 5)
  const all = snap.people.map((p): TeamMember => ({
    id: p.pcoId,
    name: p.name,
    handle: p.handle,
    team: p.team,
    role: p.role,
    initials: initials(p.name),
    assessment: assess(p.events, now, 26),
  }));
  const members = all.filter((m) => m.assessment.recentlyActive);
  return { members, all, info: { source: "planning-center", org: snap.org, generatedAt: snap.generatedAt } as TeamInfo };
}

function load() {
  if (!cache) cache = build();
  return cache;
}

export async function getTeam(): Promise<TeamMember[]> {
  return (await load()).members;
}
export async function getTeamInfo(): Promise<TeamInfo> {
  return (await load()).info;
}
export async function getMember(id: string): Promise<TeamMember | undefined> {
  return (await load()).all.find((m) => m.id === id);
}

export async function isRecentlyActiveMember(id: string): Promise<boolean> {
  const m = (await load()).all.find((x) => x.id === id);
  return !!m?.assessment.recentlyActive;
}

const SEV: Record<string, number> = { elevated: 3, watch: 2, steady: 1 };

/** People worth a check-in (flagged), highest concern first. */
export function getFlagged(members: TeamMember[]): TeamMember[] {
  return members
    .filter((m) => m.assessment.status !== "steady")
    .sort((a, b) => SEV[b.assessment.status] - SEV[a.assessment.status] || b.assessment.streakWeeks - a.assessment.streakWeeks);
}

export interface TeamGroup {
  team: string;
  emoji: string;
  members: TeamMember[];
  flagged: number;
  status: "steady" | "watch" | "elevated";
}

const TEAM_EMOJI: { match: RegExp; emoji: string }[] = [
  { match: /worship|music|band|vocal/i, emoji: "🎵" },
  { match: /prod|media|audio|light|cam|slide|gfx|tech/i, emoji: "🎛️" },
  { match: /kid|child|next gen|pre-?school/i, emoji: "🧸" },
  { match: /welcom|host|door|carpark|usher|greet/i, emoji: "🤝" },
  { match: /cafe|kitchen|coffee|hospitalit/i, emoji: "☕" },
  { match: /online|stream/i, emoji: "💻" },
];
function emojiFor(team: string): string {
  return TEAM_EMOJI.find((t) => t.match.test(team))?.emoji ?? "✨";
}

/** Groups members by team, worst-status teams first. */
export function getTeamGroups(members: TeamMember[]): TeamGroup[] {
  const map = new Map<string, TeamMember[]>();
  for (const m of members) {
    const g = map.get(m.team) ?? [];
    g.push(m);
    map.set(m.team, g);
  }
  return [...map.entries()]
    .map(([team, ms]) => {
      const flagged = ms.filter((m) => m.assessment.status !== "steady").length;
      const hasElevated = ms.some((m) => m.assessment.status === "elevated");
      const status = hasElevated ? "elevated" : flagged > 0 ? "watch" : "steady";
      return { team, emoji: emojiFor(team), members: ms, flagged, status: status as TeamGroup["status"] };
    })
    .filter((g) => g.members.length >= 2)
    .sort((a, b) => SEV[b.status] - SEV[a.status] || b.flagged - a.flagged);
}

/** One team by name (exact match), or undefined. Includes small teams too. */
export async function getTeamGroupByName(name: string): Promise<TeamGroup | undefined> {
  const members = (await load()).members.filter((m) => m.team === name);
  if (members.length === 0) return undefined;
  const flagged = members.filter((m) => m.assessment.status !== "steady").length;
  const hasElevated = members.some((m) => m.assessment.status === "elevated");
  const status = hasElevated ? "elevated" : flagged > 0 ? "watch" : "steady";
  return { team: name, emoji: emojiFor(name), members, flagged, status };
}
