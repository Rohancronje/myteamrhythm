// Server wrapper: reads the session and renders the role-scoped bottom nav.
// Pages use <AppNav/> so nav items always match the signed-in user's access.
import { BottomNav } from "./BottomNav";
import { getSession } from "@/lib/auth/server";
import { navFor } from "@/lib/auth/access";
import { getAttention } from "@/lib/data/attention";
import { isWorshipCoach } from "@/lib/data/teams-admin";

export async function AppNav() {
  const session = await getSession();
  if (!session) return null; // public pages (e.g. pulse without login) get no app nav
  const [attention, worshipCoach] = await Promise.all([
    getAttention(session),
    session.role === "coach" ? isWorshipCoach(session.email) : Promise.resolve(false),
  ]);
  return (
    <BottomNav
      items={navFor(session.role, { worshipCoach })}
      user={{ name: session.name, role: session.role }}
      attention={attention}
    />
  );
}
