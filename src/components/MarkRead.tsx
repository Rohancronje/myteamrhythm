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
      <div className="flex items-center justify-center gap-2 rounded-full grad-mint py-3.5 text-sm font-semibold text-[#04231a]">
        ✓ Read today — nice one
      </div>
    );
  }
  return (
    <button onClick={mark} disabled={busy} className="w-full rounded-full grad-brand py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40">
      {busy ? "Saving…" : "Mark as read"}
    </button>
  );
}
