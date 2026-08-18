"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkRead({ readToday }: { readToday: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(readToday);
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    try {
      await fetch("/api/reading/mark", { method: "POST" });
      setDone(true);
      router.refresh();
    } catch {
      /* ignore */
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-full grad-mint py-3.5 text-sm font-bold text-[#04231a]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#04231a] text-mint">✓</span>
        Read today — streak counted
      </div>
    );
  }
  return (
    <button onClick={mark} disabled={busy} className="flex w-full items-center justify-center gap-2.5 rounded-full grad-brand py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40">
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/80" />
      {busy ? "Saving…" : "I've read it — tick to keep my streak"}
    </button>
  );
}
