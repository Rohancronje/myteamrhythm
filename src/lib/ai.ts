// Claude-powered rewrite of coach FYI notes so they stay within the NZ Privacy Act
// 2020 and basic confidentiality. Notes are meant to prime the next friendly chat —
// never a record of sensitive personal information. Fail-open: if the API isn't
// configured or errors, we return the original note rather than block the coach.

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `You rewrite a volunteer coach's short "FYI note" about a church volunteer so it complies with the New Zealand Privacy Act 2020 and ordinary pastoral confidentiality.

The note is a light cue to warm up the NEXT friendly conversation — it is NOT a record and is not confidential case notes.

Rewrite the note so it:
- REMOVES sensitive personal information: health, medical or mental-health details, disability, pregnancy, sexual orientation, specific religious/political views, ethnicity/immigration status, financial hardship, criminal or legal matters, addiction, and any relationship/family conflict details.
- REMOVES information about any third party (other people mentioned).
- Contains NO diagnoses, speculation, gossip, judgements, or anything embarrassing or potentially harmful if disclosed.
- KEEPS only light, respectful, non-sensitive context that helps the next chat (e.g. "just started a new job", "away in September", "loves a coffee catch-up", "new to the team").
- If the whole note is sensitive, reduce it to a neutral cue like "worth a personal check-in" with no details.
- Is short: one plain sentence, under 140 characters, no names of others.

Return ONLY the rewritten note text — no preamble, no quotation marks, no explanation. If nothing appropriate remains, return an empty string.`;

export interface SanitizeResult {
  text: string;
  changed: boolean;
  applied: boolean; // whether the AI actually ran
}

/** Rewrite an FYI note for privacy/confidentiality. Fail-open on any problem. */
export async function sanitizeNote(note: string): Promise<SanitizeResult> {
  const original = (note ?? "").trim();
  if (!original) return { text: "", changed: false, applied: false };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: original, changed: false, applied: false };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: `Rewrite this FYI note:\n\n${original.slice(0, 1000)}` }],
      }),
    });
    if (!res.ok) return { text: original, changed: false, applied: false };
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = (data.content?.find((c) => c.type === "text")?.text ?? "").trim().replace(/^["']|["']$/g, "");
    // If the model returned nothing usable, keep the original (fail-open).
    if (!out) return { text: original, changed: false, applied: true };
    return { text: out, changed: out.toLowerCase() !== original.toLowerCase(), applied: true };
  } catch {
    return { text: original, changed: false, applied: false };
  }
}
