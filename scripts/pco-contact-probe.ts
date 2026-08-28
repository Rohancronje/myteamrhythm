// Probe: are contact details (email / phone) available from Planning Center for
// this org, with THIS token? Tries several endpoints independently and reports
// coverage only (masked) — never dumps real contact info.
// Run: pnpm tsx scripts/pco-contact-probe.ts
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

const auth = "Basic " + Buffer.from(`${process.env.PCO_APP_ID}:${process.env.PCO_SECRET}`).toString("base64");

function mask(s: string): string {
  if (!s) return "";
  if (s.includes("@")) { const [u, d] = s.split("@"); return `${u.slice(0, 2)}***@${d}`; }
  return s.replace(/\d(?=\d{2})/g, "•");
}

async function probe(label: string, url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
    if (!res.ok) {
      console.log(`[${res.status}] ${label}  — ${(await res.text()).slice(0, 120).replace(/\s+/g, " ")}`);
      return null;
    }
    console.log(`[200] ${label}  ✓`);
    return res.json();
  } catch (e) {
    console.log(`[ERR] ${label} — ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log("\n=== PCO CONTACT-DETAIL PROBE ===\n");

  // A. People API — the canonical home of emails/phones.
  const ppl = await probe("people/v2/people ?include=emails,phone_numbers",
    "https://api.planningcenteronline.com/people/v2/people?include=emails,phone_numbers&per_page=25");
  if (ppl) {
    const emails = (ppl.included ?? []).filter((r: any) => r.type === "Email");
    const phones = (ppl.included ?? []).filter((r: any) => r.type === "PhoneNumber");
    const n = ppl.data.length;
    console.log(`   sampled ${n} people (org total ≈ ${ppl.meta?.total_count ?? "?"})`);
    console.log(`   with email: ${new Set(emails.map((e: any) => e.relationships?.person?.data?.id)).size}/${n}`);
    console.log(`   with phone: ${new Set(phones.map((p: any) => p.relationships?.person?.data?.id)).size}/${n}`);
    emails.slice(0, 2).forEach((e: any) => console.log(`   e.g. email ${mask(e.attributes.address)}`));
    phones.slice(0, 2).forEach((p: any) => console.log(`   e.g. phone ${mask(p.attributes.number)}`));
  }

  // B. Services API people — does it expose contact_data at all?
  const svc = await probe("services/v2/people",
    "https://api.planningcenteronline.com/services/v2/people?per_page=3");
  if (svc?.data?.[0]) {
    console.log(`   Services person attributes: ${Object.keys(svc.data[0].attributes).join(", ")}`);
  }

  // C. A single person's contact_data via People (some tokens allow record-level).
  if (svc?.data?.[0]) {
    const pid = svc.data[0].id;
    await probe(`people/v2/people/${pid}?include=emails,phone_numbers`,
      `https://api.planningcenteronline.com/people/v2/people/${pid}?include=emails,phone_numbers`);
  }

  console.log("");
}

main();
