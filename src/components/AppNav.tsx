// Server wrapper: reads the session and renders the role-scoped bottom nav.
// Pages use <AppNav/> so nav items always match the signed-in user's access.
import { BottomNav } from "./BottomNav";
import { getSession } from "@/lib/auth/server";
import { navFor } from "@/lib/auth/access";

export async function AppNav() {
  const session = await getSession();
  if (!session) return null; // public pages (e.g. pulse without login) get no app nav
  return <BottomNav items={navFor(session.role, session.personId)} />;
}
