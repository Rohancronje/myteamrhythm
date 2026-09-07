import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { ResourcesView } from "@/components/ResourcesView";
import { getSession } from "@/lib/auth/server";
import { getPerms } from "@/lib/auth/permissions";
import { getResources } from "@/lib/data/resources";

export const dynamic = "force-dynamic";

// Shared resource library — links + PDFs with comments. Open to everyone who signs in.
export default async function ResourcesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "coach", "leader", "pastor"].includes(session.role)) redirect("/login");

  const [resources, perms] = await Promise.all([getResources(), getPerms(session.email, session.role)]);

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-4xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Resources</p>
        </div>
        <AccountChip />
      </header>

      <ResourcesView resources={resources} canPost={perms.canPostResources} />

      <AppNav />
    </main>
  );
}
