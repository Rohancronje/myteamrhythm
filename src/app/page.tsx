import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { homePathFor } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

// The app is a volunteer connection platform: admins manage teams, coaches connect.
// Route each role to its home; unauthenticated users to login.
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(homePathFor(session.role));
}
