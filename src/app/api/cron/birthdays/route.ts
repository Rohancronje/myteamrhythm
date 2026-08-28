import { NextResponse } from "next/server";
import { getTodaysBirthdaysByCoach } from "@/lib/data/birthdays";
import { nzNowAnchor } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Morning birthday reminder (Vercel Cron). Emails each coach the volunteers on
// their team(s) with a birthday today. Secured by CRON_SECRET (Vercel sends it in
// the Authorization header). Can also be run manually with the same header.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const digests = await getTodaysBirthdaysByCoach(nzNowAnchor());
    if (!digests.length) return NextResponse.json({ ok: true, sent: 0, note: "no birthdays today" });

    const { sendEmail, birthdayReminderEmail } = await import("@/lib/email");
    let sent = 0;
    const failures: string[] = [];
    for (const dg of digests) {
      const { subject, html } = birthdayReminderEmail({ coachName: dg.coachName, people: dg.people });
      const mail = await sendEmail({ to: dg.coachEmail, toName: dg.coachName, subject, html });
      if (mail.ok) sent++;
      else failures.push(`${dg.coachEmail}: ${mail.error}`);
    }
    return NextResponse.json({ ok: true, sent, coaches: digests.length, failures });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
