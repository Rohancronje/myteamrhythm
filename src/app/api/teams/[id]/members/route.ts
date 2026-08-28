import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { addMembers } from "@/lib/data/teams-admin";

const Member = z.object({
  // No min length — blank/trailing rows are filtered server-side in addMembers so
  // one empty row from a spreadsheet doesn't reject the whole import.
  name: z.string().max(160),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  birthday: z.string().max(40).optional().nullable(),
  role: z.string().max(160).optional().nullable(),
});
const Input = z.object({ members: z.array(Member).min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const { added, updated } = await addMembers(id, parsed.data.members, session.email);
    return NextResponse.json({ ok: true, added, updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
