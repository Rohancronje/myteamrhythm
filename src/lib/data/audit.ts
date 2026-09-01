// Audit trail. logAudit() is deliberately fire-and-forget and defensive: it must
// NEVER throw or block the action it records (a broken audit write can't be allowed
// to take down account creation, etc.). getAuditLog() powers the owner-only view.

export interface AuditEntry {
  id: string;
  at: string; // ISO
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  target: string | null;
  detail: string | null;
}

export interface AuditActor {
  email?: string | null;
  name?: string | null;
}

/** Record a consequential action. Swallows all errors — recording an audit entry
 *  must never break the thing being audited. */
export async function logAudit(action: string, opts?: { actor?: AuditActor; target?: string | null; detail?: string | null }): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getDb } = await import("@/db");
    const { auditLog } = await import("@/db/schema");
    await getDb().insert(auditLog).values({
      action,
      actorEmail: opts?.actor?.email ?? null,
      actorName: opts?.actor?.name ?? null,
      target: opts?.target ?? null,
      detail: opts?.detail ?? null,
    });
  } catch {
    /* never surface an audit failure to the caller */
  }
}

/** Most recent audit entries (newest first). Empty on any error. */
export async function getAuditLog(limit = 250): Promise<AuditEntry[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { auditLog } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await getDb().select().from(auditLog).orderBy(desc(auditLog.at)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      at: r.at.toISOString(),
      actorEmail: r.actorEmail,
      actorName: r.actorName,
      action: r.action,
      target: r.target,
      detail: r.detail,
    }));
  } catch {
    return [];
  }
}
