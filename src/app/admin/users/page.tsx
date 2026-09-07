import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { AccountsManager } from "@/components/AccountsManager";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function loadUsers() {
  if (!process.env.DATABASE_URL) return [];
  const { getDb } = await import("@/db");
  const { users } = await import("@/db/schema");
  const rows = await getDb().select().from(users);
  const order: Record<string, number> = { admin: 0, pastor: 1, coach: 2, leader: 3, member: 4 };
  return rows
    .map((u) => ({ email: u.email, name: u.name, role: u.role, teams: u.teams ?? [], canPostEvents: !!u.canPostEvents, canPostResources: !!u.canPostResources }))
    .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name));
}

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  const users = await loadUsers();

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/connect" className="text-sm text-mute transition-colors hover:text-text">← Connect</Link>
        <Wordmark />
        <AccountChip />
      </header>

      <h1 className="rise mb-1 font-display text-2xl font-bold text-text">Accounts</h1>
      <p className="rise mb-6 text-sm text-mute">Reset any account&apos;s password, then share the new one with them.</p>

      <AccountsManager users={users} />

      <AppNav />
    </div>
  );
}
