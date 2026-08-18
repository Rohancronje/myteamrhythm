import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { SongTagger } from "@/components/SongTagger";
import { getSession } from "@/lib/auth/server";
import { getSongsForTagging } from "@/lib/data/songtags";

export const dynamic = "force-dynamic";

// Song → theme + scripture tagging (backoffice, admin only). Lyrics are never
// stored — the editor links out to SongSelect; only conclusions are saved.
export default async function SongTagPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/");
  const songs = await getSongsForTagging();

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-4 flex items-center justify-between">
        <Link href="/songs" className="text-sm text-mute transition-colors hover:text-text">← Songs</Link>
        <Wordmark />
      </header>

      <div className="rise mb-5">
        <h1 className="font-display text-2xl font-bold text-text">Tag songs</h1>
        <p className="mt-1 text-sm text-mute text-balance">
          Themes + scripture per song, so reading plans can surface relevant songs. Read lyrics on SongSelect — log only your conclusions here.
        </p>
      </div>

      <SongTagger songs={songs} />

      <AppNav />
    </div>
  );
}
