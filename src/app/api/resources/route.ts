import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getPerms } from "@/lib/auth/permissions";
import { createResource } from "@/lib/data/resources";

export const runtime = "nodejs";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function notifyNewResource(title: string, addedByName: string, kind: string) {
  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const rows = await getDb().select({ email: users.email, name: users.name }).from(users).where(inArray(users.role, ["admin", "coach", "leader", "pastor"]));
    const { sendEmail, newResourceEmail } = await import("@/lib/email");
    for (const u of rows) {
      const { subject, html } = newResourceEmail({ recipientName: u.name, title, addedByName, kind });
      await sendEmail({ to: u.email, toName: u.name, subject, html });
    }
  } catch {
    /* notifications are best-effort */
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("forbidden", 403);
  const perms = await getPerms(session.email, session.role);
  if (!perms.canPostResources) return bad("You don't have permission to post resources.", 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return bad("invalid form"); }
  const title = String(form.get("title") ?? "").trim();
  const detail = String(form.get("detail") ?? "").trim();
  const kind = String(form.get("kind") ?? "link");
  if (!title) return bad("Give the resource a title.");

  let url = "";
  let fileName: string | null = null;

  if (kind === "pdf") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return bad("Choose a PDF to upload.");
    if (file.type && file.type !== "application/pdf") return bad("Only PDF files are supported.");
    if (file.size > 15 * 1024 * 1024) return bad("That PDF is too large (max 15MB).");
    if (!process.env.BLOB_READ_WRITE_TOKEN) return bad("PDF upload isn't set up yet — add a link instead, or ask your admin to enable Blob storage in Vercel.");
    try {
      const { put } = await import("@vercel/blob");
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const blob = await put(`resources/${Date.now()}-${safe}`, file, { access: "public", contentType: "application/pdf" });
      url = blob.url;
      fileName = file.name;
    } catch (e) {
      return bad(`Upload failed: ${(e as Error).message}`, 500);
    }
  } else {
    url = String(form.get("url") ?? "").trim();
    if (!/^https?:\/\//i.test(url)) return bad("Enter a valid link starting with https://");
  }

  try {
    await createResource({ title, detail, kind, url, fileName, addedBy: session.email, addedByName: session.name });
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("resource.add", { actor: { email: session.email, name: session.name }, target: title, detail: kind === "pdf" ? "PDF uploaded" : "Link added" });
    await notifyNewResource(title, session.name, kind);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad((e as Error).message, 500);
  }
}
