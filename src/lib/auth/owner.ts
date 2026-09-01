// Platform owner ("Admin+"). An owner is an admin whose email is designated here —
// they see extra surfaces (the audit log) that ordinary admins don't. Kept as an
// email allow-list (not a new role) so every existing admin check keeps working
// unchanged, with zero risk of locking anyone out.
//
// Configure with OWNER_EMAILS (comma-separated) in the environment; falls back to the
// founding owner so it works even before that env var is set.

const FALLBACK_OWNERS = ["rohan87cronje@gmail.com"];

function ownerEmails(): string[] {
  const fromEnv = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : FALLBACK_OWNERS;
}

/** Is this email a platform owner? Owners are also admins, so ordinary admin
 *  access is unaffected — this only gates owner-only surfaces. */
export function isOwner(email: string | undefined | null): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}
