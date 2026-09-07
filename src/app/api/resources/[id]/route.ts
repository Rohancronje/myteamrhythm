import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getPerms } from "@/lib/auth/permissions";
import { deleteResource } from "@/lib/data/resources";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const perms = await getPerms(session.email, session.role);
  if (!perms.canPostResources) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    await deleteResource(id);
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("resource.remove", { actor: { email: session.email, name: session.name }, detail: "Removed a resource" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
