import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { NotificationsView } from "@/components/NotificationsView";
import { getSession } from "@/lib/auth/server";
import { listNotifications } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

// The coach/admin notifications feed. Reminders they set on a contact fire here on
// the day (alongside an email). Opening the page clears the unread badge.
export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "coach" && session.role !== "admin") redirect("/home");

  const notifications = await listNotifications(session.email);

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-3xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Notifications</p>
        </div>
        <AccountChip />
      </header>

      <NotificationsView initial={notifications} />

      <AppNav />
    </main>
  );
}
