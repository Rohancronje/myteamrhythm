import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { nzToday } from "@/lib/time";

const Input = z.object({
  title: z.string().min(1).max(200),
  displayTitle: z.string().min(1).max(200),
  themes: z.array(z.string().max(60)).max(20),
  scriptureRefs: z.array(z.string().max(60)).max(30),
  status: z.enum(["pending", "tagged", "needs_review"]),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  const { getDb } = await import("@/db");
  const { songTags } = await import("@/db/schema");
  await getDb()
    .insert(songTags)
    .values({
      title: p.title.toLowerCase(),
      displayTitle: p.displayTitle,
      themes: p.themes,
      scriptureRefs: p.scriptureRefs,
      status: p.status,
      taggedBy: session.name,
      taggedAt: new Date(nzToday() + "T12:00:00Z"),
      notes: p.notes ?? null,
    })
    .onConflictDoUpdate({
      target: songTags.title,
      set: { displayTitle: p.displayTitle, themes: p.themes, scriptureRefs: p.scriptureRefs, status: p.status, taggedBy: session.name, taggedAt: new Date(nzToday() + "T12:00:00Z"), notes: p.notes ?? null },
    });

  // The song→scripture map just changed — refresh it so the new tags show on the
  // setlist, Song Intelligence and Today devotional right away.
  revalidateTag("song-tags", "max");

  return NextResponse.json({ ok: true });
}
