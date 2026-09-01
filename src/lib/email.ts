// Transactional email via Brevo (HTTP API). Sends from the verified domain sender.
// Fails soft — the caller decides what to do if email isn't configured / bounces.

interface SendArgs {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, toName, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, error: "email not configured" };
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL || "no-reply@myteamrhythm.online",
    name: process.env.BREVO_SENDER_NAME || "Rhythm",
  };
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender, to: [{ email: to, name: toName || to }], subject, htmlContent: html }),
    });
    if (!res.ok) return { ok: false, error: `brevo ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function appUrl(): string {
  return process.env.APP_URL || "https://myteamrhythm.online";
}

/** The shared "Your sign-in" credential card. Labels sit ABOVE their values and
 *  both email + password wrap (word-break) instead of overflowing — so a long
 *  address or a generated password never forces horizontal scroll on a phone. */
function signInBlock(email: string, password: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6fc;border:1px solid #eae7f4;border-radius:16px;margin:0 0 26px;"><tr><td style="padding:20px 22px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#948da8;font-weight:700;margin-bottom:16px;">Your sign-in</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#948da8;font-weight:700;margin-bottom:4px;">Email</div>
<div style="font-size:15px;line-height:1.45;color:#171426;font-weight:600;word-break:break-all;margin-bottom:16px;">${email}</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#948da8;font-weight:700;margin-bottom:6px;">Password</div>
<div><span style="display:inline-block;max-width:100%;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:15px;line-height:1.5;background:#efeaff;color:#5b3fd6;padding:8px 14px;border-radius:8px;letter-spacing:.5px;word-break:break-all;">${password}</span></div>
</td></tr></table>`;
}

/** The invite a coach receives when an admin adds them. */
export function coachInviteEmail(opts: {
  coachName: string;
  inviterName: string;
  teams: string[];
  email: string;
  password: string;
}): { subject: string; html: string } {
  const first = opts.coachName.split(/\s+/)[0] || opts.coachName;
  const hasTeams = opts.teams.filter(Boolean).length > 0;
  const teamLabel = opts.teams.filter(Boolean).join(" · ");
  const url = appUrl();
  const logo = `${url}/logo.jpg`;
  const subject = `You're invited to coach with Rhythm`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ecebf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171426;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.inviterName} has invited you to Rhythm — your sign-in is inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebf2;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 48px rgba(23,16,44,.14);border:1px solid #e6e4ef;">
<tr><td style="background:#0a0912;padding:34px 32px 30px;text-align:center;">
<img src="${logo}" width="220" alt="Rhythm — Church Volunteer Platform" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#8b6cff,#c06cff,#ff5c8a);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 38px 6px;">
<p style="font-size:17px;font-weight:600;margin:0 0 16px;color:#171426;">Hi ${first},</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:#2c2740;"><strong style="color:#171426;">${opts.inviterName}</strong> has invited you to <strong style="color:#171426;">Rhythm</strong> as a <strong style="color:#171426;">Coach</strong>${hasTeams ? ` for <strong style="color:#171426;">${teamLabel}</strong>` : ""}.</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 26px;color:#5a5470;">Rhythm helps you keep a simple rhythm of connection with your team &mdash; who to reach out to, birthdays to remember, and an encouraging verse to send. A few thoughtful minutes each week, real impact for your people.</p>
${signInBlock(opts.email, opts.password)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#8b6cff,#ff5c8a);box-shadow:0 10px 24px rgba(139,108,255,.4);">
<a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 40px;border-radius:999px;">Open Rhythm &nbsp;&rarr;</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#948da8;margin:0 0 4px;text-align:center;">Just sign in with the details above &mdash; no setup needed.<br>Forgot your password later? Your admin can reset it in seconds.</p>
</td></tr>
<tr><td style="padding:22px 38px 30px;border-top:1px solid #f0eef6;">
<div style="font-size:11px;line-height:1.6;color:#aba6bb;text-align:center;">Rhythm &mdash; a volunteer connection platform for churches.<br>If you weren&rsquo;t expecting this, you can safely ignore this email.</div>
</td></tr>
</table>
<div style="max-width:560px;font-size:11px;color:#b4b0c2;padding:16px 8px 0;text-align:center;">Sent by Rhythm &middot; myteamrhythm.online</div>
</td></tr></table></body></html>`;
  return { subject, html };
}

/** Sent when an admin adds a person on the Accounts page (any role). */
export function accountInviteEmail(opts: {
  name: string;
  inviterName: string;
  roleLabel: string;
  email: string;
  password: string;
}): { subject: string; html: string } {
  const first = opts.name.split(/\s+/)[0] || opts.name;
  const url = appUrl();
  const logo = `${url}/logo.jpg`;
  const subject = `You've been added to Rhythm`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ecebf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171426;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.inviterName} has added you to Rhythm — your sign-in is inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebf2;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 48px rgba(23,16,44,.14);border:1px solid #e6e4ef;">
<tr><td style="background:#0a0912;padding:34px 32px 30px;text-align:center;">
<img src="${logo}" width="220" alt="Rhythm — Church Volunteer Platform" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#8b6cff,#c06cff,#ff5c8a);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 38px 6px;">
<p style="font-size:17px;font-weight:600;margin:0 0 16px;color:#171426;">Hi ${first},</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 26px;color:#2c2740;"><strong style="color:#171426;">${opts.inviterName}</strong> has added you to <strong style="color:#171426;">Rhythm</strong> as ${/^[aeiou]/i.test(opts.roleLabel) ? "an" : "a"} <strong style="color:#171426;">${opts.roleLabel}</strong>. Here are your sign-in details:</p>
${signInBlock(opts.email, opts.password)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#8b6cff,#ff5c8a);box-shadow:0 10px 24px rgba(139,108,255,.4);">
<a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 40px;border-radius:999px;">Open Rhythm &nbsp;&rarr;</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#948da8;margin:0 0 4px;text-align:center;">Just sign in with the details above &mdash; no setup needed.</p>
</td></tr>
<tr><td style="padding:22px 38px 30px;border-top:1px solid #f0eef6;">
<div style="font-size:11px;line-height:1.6;color:#aba6bb;text-align:center;">Rhythm &mdash; a volunteer connection platform for churches.<br>If you weren&rsquo;t expecting this, you can safely ignore this email.</div>
</td></tr>
</table>
<div style="max-width:560px;font-size:11px;color:#b4b0c2;padding:16px 8px 0;text-align:center;">Sent by Rhythm &middot; myteamrhythm.online</div>
</td></tr></table></body></html>`;
  return { subject, html };
}

/** Self-service "forgot password" — a one-time reset link (no password inside). */
export function passwordResetLinkEmail(opts: { name: string; token: string }): { subject: string; html: string } {
  const first = opts.name.split(/\s+/)[0] || opts.name;
  const url = appUrl();
  const logo = `${url}/logo.jpg`;
  const link = `${url}/reset?token=${encodeURIComponent(opts.token)}`;
  const subject = `Reset your Rhythm password`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ecebf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171426;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Reset your Rhythm password — this link expires in 1 hour.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebf2;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 48px rgba(23,16,44,.14);border:1px solid #e6e4ef;">
<tr><td style="background:#0a0912;padding:34px 32px 30px;text-align:center;">
<img src="${logo}" width="220" alt="Rhythm — Church Volunteer Platform" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#8b6cff,#c06cff,#ff5c8a);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 38px 6px;">
<p style="font-size:17px;font-weight:600;margin:0 0 16px;color:#171426;">Hi ${first},</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 26px;color:#2c2740;">We got a request to reset your <strong style="color:#171426;">Rhythm</strong> password. Tap the button below to set a new one. This link expires in <strong style="color:#171426;">1 hour</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#8b6cff,#ff5c8a);box-shadow:0 10px 24px rgba(139,108,255,.4);">
<a href="${link}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 40px;border-radius:999px;">Reset my password &nbsp;&rarr;</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#948da8;margin:0 0 4px;text-align:center;">If the button doesn&rsquo;t work, copy this link into your browser:<br><span style="word-break:break-all;color:#5b3fd6;">${link}</span></p>
<p style="font-size:13px;line-height:1.6;color:#948da8;margin:14px 0 4px;text-align:center;">Didn&rsquo;t ask for this? You can safely ignore this email — your password won&rsquo;t change.</p>
</td></tr>
<tr><td style="padding:22px 38px 30px;border-top:1px solid #f0eef6;">
<div style="font-size:11px;line-height:1.6;color:#aba6bb;text-align:center;">Rhythm &mdash; a volunteer connection platform for churches.</div>
</td></tr>
</table>
<div style="max-width:560px;font-size:11px;color:#b4b0c2;padding:16px 8px 0;text-align:center;">Sent by Rhythm &middot; myteamrhythm.online</div>
</td></tr></table></body></html>`;
  return { subject, html };
}

/** Morning reminder to a coach: volunteers on their team with a birthday today. */
export function birthdayReminderEmail(opts: {
  coachName: string;
  people: { name: string; team: string }[];
}): { subject: string; html: string } {
  const first = opts.coachName.split(/\s+/)[0] || opts.coachName;
  const url = appUrl();
  const logo = `${url}/logo.jpg`;
  const n = opts.people.length;
  const subject = n === 1 ? `🎂 ${opts.people[0].name} has a birthday today` : `🎂 ${n} birthdays on your team today`;
  const rows = opts.people
    .map((p) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f0eef6;"><span style="font-size:15px;font-weight:600;color:#171426;">${p.name}</span><span style="font-size:13px;color:#948da8;"> &middot; ${p.team}</span></td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ecebf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171426;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${n} of your volunteers ${n === 1 ? "has" : "have"} a birthday today.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebf2;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 48px rgba(23,16,44,.14);border:1px solid #e6e4ef;">
<tr><td style="background:#0a0912;padding:34px 32px 30px;text-align:center;">
<img src="${logo}" width="220" alt="Rhythm — Church Volunteer Platform" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#8b6cff,#c06cff,#ff5c8a);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 38px 8px;">
<p style="font-size:17px;font-weight:600;margin:0 0 8px;color:#171426;">Morning ${first}! 🎂</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 22px;color:#2c2740;">${n === 1 ? "One of your volunteers has" : `${n} of your volunteers have`} a birthday today. A quick message would mean a lot:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">${rows}</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#8b6cff,#ff5c8a);box-shadow:0 10px 24px rgba(139,108,255,.4);">
<a href="${url}/birthdays" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 40px;border-radius:999px;">Open Birthdays &nbsp;&rarr;</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 38px 30px;border-top:1px solid #f0eef6;">
<div style="font-size:11px;line-height:1.6;color:#aba6bb;text-align:center;">Rhythm &mdash; a volunteer connection platform for churches.</div>
</td></tr>
</table>
<div style="max-width:560px;font-size:11px;color:#b4b0c2;padding:16px 8px 0;text-align:center;">Sent by Rhythm &middot; myteamrhythm.online</div>
</td></tr></table></body></html>`;
  return { subject, html };
}

/** Sent to a person when an admin resets their password. */
export function passwordResetEmail(opts: {
  name: string;
  inviterName: string;
  email: string;
  password: string;
}): { subject: string; html: string } {
  const first = opts.name.split(/\s+/)[0] || opts.name;
  const url = appUrl();
  const logo = `${url}/logo.jpg`;
  const subject = `Your Rhythm password has been reset`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ecebf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171426;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Rhythm sign-in has been updated — new password inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecebf2;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 48px rgba(23,16,44,.14);border:1px solid #e6e4ef;">
<tr><td style="background:#0a0912;padding:34px 32px 30px;text-align:center;">
<img src="${logo}" width="220" alt="Rhythm — Church Volunteer Platform" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="height:5px;background:linear-gradient(90deg,#8b6cff,#c06cff,#ff5c8a);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:34px 38px 6px;">
<p style="font-size:17px;font-weight:600;margin:0 0 16px;color:#171426;">Hi ${first},</p>
<p style="font-size:15px;line-height:1.65;margin:0 0 26px;color:#2c2740;"><strong style="color:#171426;">${opts.inviterName}</strong> has reset your <strong style="color:#171426;">Rhythm</strong> password. Here are your updated sign-in details:</p>
${signInBlock(opts.email, opts.password)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center" style="border-radius:999px;background:linear-gradient(135deg,#8b6cff,#ff5c8a);box-shadow:0 10px 24px rgba(139,108,255,.4);">
<a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 40px;border-radius:999px;">Open Rhythm &nbsp;&rarr;</a>
</td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#948da8;margin:0 0 4px;text-align:center;">For your security, consider changing this to something only you know after signing in.<br>If you didn&rsquo;t expect this, contact your admin.</p>
</td></tr>
<tr><td style="padding:22px 38px 30px;border-top:1px solid #f0eef6;">
<div style="font-size:11px;line-height:1.6;color:#aba6bb;text-align:center;">Rhythm &mdash; a volunteer connection platform for churches.</div>
</td></tr>
</table>
<div style="max-width:560px;font-size:11px;color:#b4b0c2;padding:16px 8px 0;text-align:center;">Sent by Rhythm &middot; myteamrhythm.online</div>
</td></tr></table></body></html>`;
  return { subject, html };
}
