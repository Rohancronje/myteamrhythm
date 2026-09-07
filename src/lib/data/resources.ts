// Shared resources (links / PDFs) with comments.

export interface ResourceComment {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string; // ISO
}
export interface ResourceItem {
  id: string;
  title: string;
  detail: string | null;
  kind: string; // 'link' | 'pdf'
  url: string;
  fileName: string | null;
  addedByName: string | null;
  createdAt: string; // ISO
  comments: ResourceComment[];
}

/** All resources, newest first, each with its comments (oldest first). */
export async function getResources(): Promise<ResourceItem[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { resources, resourceComments } = await import("@/db/schema");
    const { desc, asc } = await import("drizzle-orm");
    const d = getDb();
    const [rows, comments] = await Promise.all([
      d.select().from(resources).orderBy(desc(resources.createdAt)),
      d.select().from(resourceComments).orderBy(asc(resourceComments.createdAt)),
    ]);
    const byResource = new Map<string, ResourceComment[]>();
    for (const c of comments) {
      const arr = byResource.get(c.resourceId) ?? [];
      arr.push({ id: c.id, body: c.body, authorName: c.authorName, createdAt: c.createdAt.toISOString() });
      byResource.set(c.resourceId, arr);
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      kind: r.kind,
      url: r.url,
      fileName: r.fileName,
      addedByName: r.addedByName,
      createdAt: r.createdAt.toISOString(),
      comments: byResource.get(r.id) ?? [],
    }));
  } catch {
    return [];
  }
}

export async function createResource(input: { title: string; detail?: string | null; kind: string; url: string; fileName?: string | null; addedBy?: string; addedByName?: string }): Promise<void> {
  const { getDb } = await import("@/db");
  const { resources } = await import("@/db/schema");
  await getDb().insert(resources).values({
    title: input.title.trim(),
    detail: input.detail?.trim() || null,
    kind: input.kind,
    url: input.url,
    fileName: input.fileName ?? null,
    addedBy: input.addedBy ?? null,
    addedByName: input.addedByName ?? null,
  });
}

export async function deleteResource(id: string): Promise<void> {
  const { getDb } = await import("@/db");
  const { resources } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await getDb().delete(resources).where(eq(resources.id, id));
}

export async function addComment(resourceId: string, body: string, author: { email?: string | null; name?: string | null }): Promise<void> {
  const { getDb } = await import("@/db");
  const { resourceComments } = await import("@/db/schema");
  await getDb().insert(resourceComments).values({ resourceId, body: body.trim(), authorEmail: author.email ?? null, authorName: author.name ?? null });
}
