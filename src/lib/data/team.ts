// The team data layer for the pastoral view. Reads the Planning Center snapshot
// and produces real-name assessments (handover section 3: pastoral view sees real
// names). Falls back to nothing if no snapshot — the UI shows an honest empty
// state rather than sample data pretending to be real people.

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
  generatedAt: string;
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

let cache: { members: TeamMember[]; info: TeamInfo } | null = null;

function readSnapshot(): Snapshot | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-snapshot.json"), "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  return name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Real current date (handover rule 5). Kept in one place so it's easy to freeze
// for tests later.
function today(): Date {
  return new Date();
}

function build(): { members: TeamMember[]; info: TeamInfo } {
  if (cache) return cache;
  const snap = readSnapshot();
  if (!snap) {
    cache = { members: [], info: { source: "none", org: "NS Family Services", generatedAt: null } };
    return cache;
  }

  const now = today();
  const members = snap.people
    .map((p): TeamMember => ({
      id: p.pcoId,
      name: p.name,
      handle: p.handle,
      team: p.team,
      role: p.role,
      initials: initials(p.name),
      assessment: assess(p.events, now, 26),
    }))
    // Active = served at least once in the last fortnight (real-date anchored).
    .filter((m) => m.assessment.recentlyActive);

  cache = {
    members,
    info: { source: "planning-center", org: snap.org, generatedAt: snap.generatedAt },
  };
  return cache;
}

export function getTeam(): TeamMember[] {
  return build().members;
}
export function getTeamInfo(): TeamInfo {
  return build().info;
}
export function getMember(id: string): TeamMember | undefined {
  return build().members.find((m) => m.id === id);
}

const SEV: Record<string, number> = { elevated: 3, watch: 2, steady: 1 };

/** People worth a check-in (flagged), highest concern first. */
export function getFlagged(members: TeamMember[] = getTeam()): TeamMember[] {
  return members
    .filter((m) => m.assessment.status !== "steady")
    .sort(
      (a, b) =>
        SEV[b.assessment.status] - SEV[a.assessment.status] ||
        b.assessment.streakWeeks - a.assessment.streakWeeks,
    );
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
export function getTeamGroups(members: TeamMember[] = getTeam()): TeamGroup[] {
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
