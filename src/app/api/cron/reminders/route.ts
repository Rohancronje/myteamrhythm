import { NextResponse } from "next/server";
import { getDueReminders, markReminderFired } from "@/lib/data/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Morning reminder run (Vercel Cron). For each significant-date reminder due today,
// creates an in-app notification for the coach who made it AND emails them. Secured
// by CRON_SECRET (Vercel sends it in the Authorization header); can also be run
// manually with the same header.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const due = await getDueReminders();
    if (!due.length) return NextResponse.json({ ok: true, due: 0, note: "no reminders due today" });

    const { createNotification } = await import("@/lib/data/notifications");
    const { sendEmail, reminderEmail } = await import("@/lib/email");

    // Coach display names (email → name) for a warmer greeting.
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const userRows = await getDb().select({ email: users.email, name: users.name }).from(users);
    const nameByEmail = new Map(userRows.map((u) => [u.email, u.name]));

    let notified = 0;
    let sent = 0;
    const failures: string[] = [];
    for (const r of due) {
      const coachName = nameByEmail.get(r.coachEmail) ?? r.coachEmail;

      // In-app notification (the primary deliverable — created first).
      try {
        await createNotification({
          userEmail: r.coachEmail,
          kind: "reminder",
          title: `${r.title} — ${r.memberName}`,
          body: r.team ? `${r.memberName} · ${r.team}` : r.memberName,
          href: "/connect",
        });
        notified++;
      } catch (e) {
        failures.push(`notif ${r.coachEmail}: ${(e as Error).message}`);
      }

      // Email the coach.
      const { subject, html } = reminderEmail({ coachName, memberName: r.memberName, title: r.title, team: r.team });
      const mail = await sendEmail({ to: r.coachEmail, toName: coachName, subject, html });
      if (mail.ok) sent++;
      else failures.push(`${r.coachEmail}: ${mail.error}`);

      // Stamp fired so it won't re-send today.
      try {
        await markReminderFired(r.id);
      } catch { /* best effort */ }
    }

    return NextResponse.json({ ok: true, due: due.length, notified, sent, failures });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
