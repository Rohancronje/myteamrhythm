"use client";

// Import volunteers from CSV / Excel. Parses in the browser with SheetJS, auto-maps
// columns by header (name / email / phone / birthday / role), shows a preview, then
// posts the rows. Manual add (in TeamEditor) covers the no-file case.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberInput } from "@/lib/data/teams-admin";

type Field = "firstName" | "lastName" | "name" | "email" | "phone" | "birthday" | "role";

const MATCHERS: { key: Field; re: RegExp }[] = [
  { key: "firstName", re: /^(first ?name|given ?name|first)$/i },
  { key: "lastName", re: /^(last ?name|surname|family ?name|last)$/i },
  { key: "name", re: /^(name|full ?name|volunteer|person)$/i },
  { key: "email", re: /e-?mail/i },
  { key: "phone", re: /(phone|mobile|cell|number|contact)/i },
  { key: "birthday", re: /(birth|dob|b-?day)/i },
  { key: "role", re: /(role|position|notes?|title)/i },
];

function mapHeaders(headers: string[]): Record<number, Field> {
  const out: Record<number, Field> = {};
  headers.forEach((h, i) => {
    const label = (h ?? "").toString().trim();
    for (const m of MATCHERS) {
      if (m.re.test(label) && !Object.values(out).includes(m.key)) { out[i] = m.key; break; }
    }
  });
  const vals = Object.values(out);
  // Fallback: if no name-ish column matched, treat the first column as the name.
  if (!vals.includes("name") && !vals.includes("firstName") && !vals.includes("lastName")) out[0] = "name";
  return out;
}

export function MemberImport({ teamId }: { teamId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<MemberInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [doneDetail, setDoneDetail] = useState<{ added: number; updated: number } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setDone(null); setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      // cellDates + dateNF makes Excel date cells come through as YYYY-MM-DD strings
      // (so birthdays parse reliably) rather than serial numbers or locale formats.
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd", blankrows: false });
      if (grid.length < 2) { setErr("That file has no data rows."); setRows([]); return; }
      const map = mapHeaders(grid[0] as string[]);
      const parsed: MemberInput[] = [];
      for (const r of grid.slice(1)) {
        const row = r as string[];
        const rec: MemberInput = { name: "" };
        let first = "", last = "";
        for (const [idx, field] of Object.entries(map)) {
          const val = (row[Number(idx)] ?? "").toString().trim();
          if (field === "firstName") first = val;
          else if (field === "lastName") last = val;
          else if (field === "name") rec.name = val;
          else if (field === "email") rec.email = val;
          else if (field === "phone") rec.phone = val;
          else if (field === "birthday") rec.birthday = val;
          else if (field === "role") rec.role = val;
        }
        if (!rec.name) rec.name = `${first} ${last}`.trim();
        if (rec.name) parsed.push(rec);
      }
      if (!parsed.length) { setErr("Couldn't find any named rows — check the file has a 'Name' column."); setRows([]); return; }
      setRows(parsed);
    } catch {
      setErr("Couldn't read that file. Supported: .csv, .xlsx, .xls");
      setRows([]);
    }
  }

  async function commit() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: rows }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Import failed.");
      setDone((json.added ?? 0) + (json.updated ?? 0));
      setDoneDetail({ added: json.added ?? 0, updated: json.updated ?? 0 });
      setRows([]); setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function reset() {
    setRows([]); setFileName(""); setErr(null); setDone(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="rise glass rounded-[var(--radius-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Import volunteers</h2>
          <p className="mt-0.5 text-xs text-mute">CSV or Excel with columns like Name, Email, Phone, Birthday, Role.</p>
        </div>
        <label className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-white/[0.04]">
          Choose file
          <input ref={fileRef} onChange={onFile} type="file" accept=".csv,.xlsx,.xls" className="hidden" />
        </label>
      </div>

      {fileName && !done && <p className="mt-3 text-xs text-faint">{fileName}{rows.length ? ` · ${rows.length} volunteers found` : ""}</p>}
      {err && <p className="mt-3 text-xs text-danger">{err}</p>}
      {done !== null && doneDetail && (
        <p className="mt-3 text-xs font-semibold" style={{ color: "#34d399" }}>
          ✓ {doneDetail.added} added{doneDetail.updated > 0 ? `, ${doneDetail.updated} updated` : ""}.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-solid text-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Birthday</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="text-mute">
                    <td className="px-3 py-1.5 font-semibold text-text">{r.name}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5">{r.phone}</td>
                    <td className="px-3 py-1.5">{r.birthday}</td>
                    <td className="px-3 py-1.5">{r.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="mt-2 text-[11px] text-faint">Showing first 100 of {rows.length}.</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={commit} disabled={busy} className="rounded-full grad-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "Importing…" : `Import ${rows.length}`}</button>
            <button onClick={reset} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-mute">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
